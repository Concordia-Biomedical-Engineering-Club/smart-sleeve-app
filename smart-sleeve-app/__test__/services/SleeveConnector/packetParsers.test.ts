import {
  EMG_PACKET_LENGTH,
  IMU_PACKET_LENGTH,
  parseEMGPacketBase64,
  parseEMGPacketBytes,
  parseIMUPacketBytes,
} from "@/services/SleeveConnector/packetParsers";
import { EMG_HEADER, IMU_HEADER } from "@/constants/ble";

function withChecksum(bytes: number[]): Uint8Array {
  let checksum = bytes[0] ?? 0;
  for (let index = 1; index < bytes.length - 1; index += 1) {
    checksum ^= bytes[index];
  }
  bytes[bytes.length - 1] = checksum;
  return Uint8Array.from(bytes);
}

describe("packetParsers", () => {
  it("parses a valid EMG packet and normalizes channels", () => {
    const bytes = new Uint8Array(EMG_PACKET_LENGTH);
    bytes[0] = EMG_HEADER;
    bytes[1] = 0x78;
    bytes[2] = 0x56;
    bytes[3] = 0x34;
    bytes[4] = 0x12;

    const dataView = new DataView(bytes.buffer);
    const rawChannels = [0, 1024, 2048, 3072, 4095, -100, 512, 1536];
    rawChannels.forEach((value, index) => {
      dataView.setInt16(5 + index * 2, value, true);
    });

    const parsed = parseEMGPacketBytes(withChecksum(Array.from(bytes)));

    expect(parsed).not.toBeNull();
    expect(parsed?.checksumValid).toBe(true);
    expect(parsed?.frame.timestamp).toBe(0x12345678);
    expect(parsed?.frame.channels[0]).toBe(0);
    expect(parsed?.frame.channels[1]).toBeCloseTo(1024 / 4095, 4);
    expect(parsed?.frame.channels[4]).toBe(1);
    expect(parsed?.frame.channels[5]).toBe(0);
  });

  it("keeps parsing EMG packets even when checksum is invalid", () => {
    const bytes = withChecksum(new Array(EMG_PACKET_LENGTH).fill(0));
    bytes[0] = EMG_HEADER;
    bytes[EMG_PACKET_LENGTH - 1] ^= 0xff;

    const parsed = parseEMGPacketBase64(Buffer.from(bytes).toString("base64"));

    expect(parsed).not.toBeNull();
    expect(parsed?.checksumValid).toBe(false);
  });

  it("rejects too-short or invalid-header EMG packets", () => {
    expect(parseEMGPacketBytes(Uint8Array.from([1, 2, 3]))).toBeNull();

    const bytes = withChecksum(new Array(EMG_PACKET_LENGTH).fill(0));
    bytes[0] = 0;
    expect(parseEMGPacketBytes(bytes)).toBeNull();
  });

  it("parses IMU packets and converts AS5600 12-bit counts to knee degrees", () => {
    const bytes = new Uint8Array(IMU_PACKET_LENGTH);
    bytes[0] = IMU_HEADER;
    bytes[1] = 0xef;
    bytes[2] = 0xcd;
    bytes[3] = 0xab;
    bytes[4] = 0x90;

    const dataView = new DataView(bytes.buffer);
    dataView.setInt16(5, 4096, true);
    dataView.setInt16(7, 12, true);
    dataView.setInt16(9, -8, true);

    const parsed = parseIMUPacketBytes(withChecksum(Array.from(bytes)));

    expect(parsed).not.toBeNull();
    expect(parsed?.checksumValid).toBe(true);
    expect(parsed?.frame.timestamp).toBe(0x90abcdef);
    expect(parsed?.frame.roll).toBeCloseTo(90, 4);
    expect(parsed?.frame.pitch).toBe(12);
    expect(parsed?.frame.yaw).toBe(-8);
  });

  it("falls back to legacy 14-bit count conversion for values above 12-bit range", () => {
    const bytes = new Uint8Array(IMU_PACKET_LENGTH);
    bytes[0] = IMU_HEADER;

    const dataView = new DataView(bytes.buffer);
    dataView.setInt16(5, 4096, true);

    const parsed = parseIMUPacketBytes(withChecksum(Array.from(bytes)));

    expect(parsed).not.toBeNull();
    expect(parsed?.frame.roll).toBeCloseTo(90, 4);
  });

  it("maps IMU fault sentinel to zero degrees and reports checksum validity", () => {
    const bytes = new Uint8Array(IMU_PACKET_LENGTH);
    bytes[0] = IMU_HEADER;
    const dataView = new DataView(bytes.buffer);
    dataView.setInt16(5, 0x7fff, true);

    const validBytes = withChecksum(Array.from(bytes));
    validBytes[IMU_PACKET_LENGTH - 1] ^= 0x0f;
    const parsed = parseIMUPacketBytes(validBytes);

    expect(parsed).not.toBeNull();
    expect(parsed?.frame.roll).toBe(0);
    expect(parsed?.checksumValid).toBe(false);
  });
});
