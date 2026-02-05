import z from 'zod';
import { enumToObject } from '@/lib/utils';

export enum MonitorDownReason {
  Timeout,
  InvalidStatus,
  QueryNotSatisfied,
  InvalidParams,
  InvalidResponse,
  PacketLoss,
  Expired,
  Down,
  // other unhandled
  Error = 63,
}

export const monitorDownReasons = enumToObject(MonitorDownReason);

export const baseMonitorParamsSchema = z.object({
  kind: z.string(),
  address: z.string().min(1),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
    })
    .optional(),
});

const RE_NUMBER = /^-?\d+(?:\.\d+)?$/;

export const booleanNumberStringUnion = z.union([z.boolean(), z.number(), z.string()]).transform((value) => {
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (RE_NUMBER.exec(value)) return Number(value);
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, value.length - 1);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, value.length - 1);
  return value;
});

export type BaseMonitorParams = z.infer<typeof baseMonitorParamsSchema>;

export type MonitorResponse<Kind extends string = string> = { kind: Kind; message: string } & (
  | { ok: true; latency: number }
  | { ok: false; reason: MonitorDownReason }
);
