import {
  EMG_CHAR_UUID,
  EMG_HEADER,
  EMG_PACKET_LENGTH,
  IMU_CHAR_UUID,
  IMU_HEADER,
  IMU_PACKET_LENGTH,
  SERVICE_UUID,
} from "@/constants/ble";

type ScanCallback = (
  error: Error | null,
  device: { id: string; name?: string | null } | null,
) => void;

type DisconnectCallback = (
  error?: Error | null,
  device?: { id: string },
) => void;

type CharacteristicCallback = (
  error: Error | null,
  characteristic: { value?: string | null } | null,
) => void;

type RemovableSubscription = {
  remove: jest.Mock;
};

type ProgrammableBleDeviceOptions = {
  serviceUuids?: string[];
  characteristicUuids?: string[];
};

export class ProgrammableBleDevice {
  public readonly id: string;
  public readonly name: string;
  public readonly services = jest
    .fn()
    .mockImplementation(async () =>
      this.serviceUuids.map((uuid) => ({ uuid })),
    );
  public readonly characteristicsForService = jest
    .fn()
    .mockImplementation(async (serviceUuid: string) => {
      if (!this.serviceUuids.includes(serviceUuid)) {
        return [];
      }

      return this.characteristicUuids.map((uuid) => ({ uuid }));
    });
  public readonly discoverAllServicesAndCharacteristics = jest
    .fn()
    .mockResolvedValue(undefined);
  public readonly cancelConnection = jest.fn().mockResolvedValue(undefined);
  public readonly monitorCharacteristicForService = jest.fn(
    (
      serviceUuid: string,
      characteristicUuid: string,
      callback: CharacteristicCallback,
    ): RemovableSubscription => {
      this.monitors.set(
        this.monitorKey(serviceUuid, characteristicUuid),
        callback,
      );
      return {
        remove: jest.fn(() => {
          this.monitors.delete(
            this.monitorKey(serviceUuid, characteristicUuid),
          );
        }),
      };
    },
  );
  public readonly onDisconnected = jest.fn(
    (callback: DisconnectCallback): RemovableSubscription => {
      this.disconnectCallback = callback;
      return {
        remove: jest.fn(() => {
          if (this.disconnectCallback === callback) {
            this.disconnectCallback = null;
          }
        }),
      };
    },
  );

  private monitors = new Map<string, CharacteristicCallback>();
  private disconnectCallback: DisconnectCallback | null = null;
  private readonly serviceUuids: string[];
  private readonly characteristicUuids: string[];

  constructor(
    id: string,
    name: string,
    options: ProgrammableBleDeviceOptions = {},
  ) {
    this.id = id;
    this.name = name;
    this.serviceUuids = options.serviceUuids ?? [SERVICE_UUID];
    this.characteristicUuids = options.characteristicUuids ?? [
      EMG_CHAR_UUID,
      IMU_CHAR_UUID,
    ];
  }

  emitEMGPacket(options: {
    timestamp: number;
    channels?: number[];
    checksumValid?: boolean;
  }): void {
    const bytes = new Uint8Array(EMG_PACKET_LENGTH);
    bytes[0] = EMG_HEADER;
    const view = new DataView(bytes.buffer);
    view.setUint32(1, options.timestamp, true);

    const channels = options.channels ?? new Array(8).fill(0);
    channels.forEach((value, index) => {
      view.setInt16(5 + index * 2, value, true);
    });

    this.emitCharacteristic(
      EMG_CHAR_UUID,
      toBase64WithChecksum(bytes, options.checksumValid ?? true),
    );
  }

  emitIMUPacket(options: {
    timestamp: number;
    rawRoll: number;
    pitch?: number;
    yaw?: number;
    checksumValid?: boolean;
  }): void {
    const bytes = new Uint8Array(IMU_PACKET_LENGTH);
    bytes[0] = IMU_HEADER;
    const view = new DataView(bytes.buffer);
    view.setUint32(1, options.timestamp, true);
    view.setInt16(5, options.rawRoll, true);
    view.setInt16(7, options.pitch ?? 0, true);
    view.setInt16(9, options.yaw ?? 0, true);

    this.emitCharacteristic(
      IMU_CHAR_UUID,
      toBase64WithChecksum(bytes, options.checksumValid ?? true),
    );
  }

  emitCorruptedPacket(characteristicUuid: string, bytes: number[]): void {
    this.emitCharacteristic(
      characteristicUuid,
      Buffer.from(Uint8Array.from(bytes)).toString("base64"),
    );
  }

  emitNotificationError(characteristicUuid: string, message: string): void {
    const callback = this.monitors.get(
      this.monitorKey(SERVICE_UUID, characteristicUuid),
    );
    callback?.(new Error(message), null);
  }

  emitUnexpectedDisconnect(message = "link lost"): void {
    this.disconnectCallback?.(new Error(message), { id: this.id });
  }

  private emitCharacteristic(characteristicUuid: string, base64: string): void {
    const callback = this.monitors.get(
      this.monitorKey(SERVICE_UUID, characteristicUuid),
    );
    callback?.(null, { value: base64 });
  }

  private monitorKey(serviceUuid: string, characteristicUuid: string): string {
    return `${serviceUuid}:${characteristicUuid}`;
  }
}

export class ProgrammableBleManager {
  public readonly state = jest.fn().mockResolvedValue("PoweredOn");
  public readonly startDeviceScan = jest.fn(
    (
      _serviceUuids: string[] | null,
      _options: unknown,
      callback: ScanCallback,
    ) => {
      this.scanCallback = callback;
    },
  );
  public readonly stopDeviceScan = jest.fn(() => undefined);
  public readonly connectToDevice = jest.fn(async (deviceId: string) => {
    const failure = this.connectFailures.shift();
    if (failure) {
      throw failure;
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Unknown device: ${deviceId}`);
    }

    return device;
  });

  private readonly devices = new Map<string, ProgrammableBleDevice>();
  private scanCallback: ScanCallback | null = null;
  private connectFailures: Error[] = [];

  registerDevice(
    id: string,
    name: string,
    options?: ProgrammableBleDeviceOptions,
  ): ProgrammableBleDevice {
    const device = new ProgrammableBleDevice(id, name, options);
    this.devices.set(id, device);
    return device;
  }

  advertiseDevice(id: string): void {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Cannot advertise unregistered device: ${id}`);
    }

    this.scanCallback?.(null, { id: device.id, name: device.name });
  }

  emitScanError(message: string): void {
    this.scanCallback?.(new Error(message), null);
  }

  completeScanWithoutResults(): void {
    // The connector resolves scans from its timeout path; this helper exists
    // so tests can intentionally avoid advertising any devices.
  }

  failNextConnections(errors: Error[]): void {
    this.connectFailures = [...errors];
  }
}

function toBase64WithChecksum(
  bytes: Uint8Array,
  checksumValid: boolean,
): string {
  const mutated = Uint8Array.from(bytes);
  let checksum = mutated[0] ?? 0;
  for (let index = 1; index < mutated.length - 1; index += 1) {
    checksum ^= mutated[index];
  }

  mutated[mutated.length - 1] = checksumValid ? checksum : checksum ^ 0xff;
  return Buffer.from(mutated).toString("base64");
}
