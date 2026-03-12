import { Buffer } from "buffer";
import { EMG_HEADER, IMU_HEADER } from "@/constants/ble";
import type { EMGData, IMUData } from "./ISleeveConnector";

export const EMG_PACKET_LENGTH = 22;
export const IMU_PACKET_LENGTH = 12;
const EMG_CHANNEL_COUNT = 8;
const EMG_ADC_MAX = 4095;
const IMU_FAULT_SENTINEL = 0x7fff;
const AS5600_ENCODER_TICKS = 4096;
const LEGACY_ENCODER_TICKS = 16384;
const AS5600_MAX_RAW_VALUE = AS5600_ENCODER_TICKS - 1;
const IMU_MAX_KNEE_DEGREES = 140;

export interface ParsedPacket<T> {
  frame: T;
  checksumValid: boolean;
}

export function parseEMGPacketBase64(
  base64: string,
): ParsedPacket<EMGData> | null {
  return parseEMGPacketBytes(Buffer.from(base64, "base64"));
}

export function parseIMUPacketBase64(
  base64: string,
): ParsedPacket<IMUData> | null {
  return parseIMUPacketBytes(Buffer.from(base64, "base64"));
}

export function parseEMGPacketBytes(
  bytes: Uint8Array,
): ParsedPacket<EMGData> | null {
  if (bytes.length < EMG_PACKET_LENGTH) {
    return null;
  }

  const buf = Buffer.from(bytes);
  const header = buf.readUInt8(0);
  if (header !== EMG_HEADER) {
    return null;
  }

  const timestamp = buf.readUInt32LE(1);
  const channels: number[] = [];

  for (
    let channelIndex = 0;
    channelIndex < EMG_CHANNEL_COUNT;
    channelIndex += 1
  ) {
    const rawValue = buf.readInt16LE(5 + channelIndex * 2);
    const normalized = Math.max(0, Math.min(1, rawValue / EMG_ADC_MAX));
    channels.push(normalized);
  }

  const checksum = buf.readUInt8(EMG_PACKET_LENGTH - 1);

  return {
    frame: {
      header,
      timestamp,
      channels,
      checksum,
    },
    checksumValid: checksum === computeChecksum(buf, EMG_PACKET_LENGTH),
  };
}

export function parseIMUPacketBytes(
  bytes: Uint8Array,
): ParsedPacket<IMUData> | null {
  if (bytes.length < IMU_PACKET_LENGTH) {
    return null;
  }

  const buf = Buffer.from(bytes);
  const header = buf.readUInt8(0);
  if (header !== IMU_HEADER) {
    return null;
  }

  const timestamp = buf.readUInt32LE(1);
  const rawRoll = buf.readInt16LE(5);
  const pitch = buf.readInt16LE(7);
  const yaw = buf.readInt16LE(9);
  const checksum = buf.readUInt8(IMU_PACKET_LENGTH - 1);

  return {
    frame: {
      header,
      timestamp,
      roll: decodeKneeFlexionDegrees(rawRoll),
      pitch,
      yaw,
      checksum,
    },
    checksumValid: checksum === computeChecksum(buf, IMU_PACKET_LENGTH),
  };
}

function computeChecksum(buf: Buffer, packetLength: number): number {
  let computedChecksum = buf.readUInt8(0);
  for (let index = 1; index < packetLength - 1; index += 1) {
    computedChecksum ^= buf.readUInt8(index);
  }
  return computedChecksum;
}

function decodeKneeFlexionDegrees(rawRoll: number): number {
  if (rawRoll === IMU_FAULT_SENTINEL || rawRoll < 0) {
    return 0;
  }

  const encoderTicks =
    rawRoll > AS5600_MAX_RAW_VALUE
      ? LEGACY_ENCODER_TICKS
      : AS5600_ENCODER_TICKS;

  return clampKneeFlexion((rawRoll * 360) / encoderTicks);
}

function clampKneeFlexion(value: number): number {
  return Math.max(0, Math.min(IMU_MAX_KNEE_DEGREES, value));
}
