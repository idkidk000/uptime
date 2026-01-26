import z from 'zod';
import type { SettingsClient } from '@/lib/settings';
import { enumToObject } from '@/lib/utils';

export enum MonitorDownReason {
  Timeout,
  InvalidStatus,
  QueryNotSatisfied,
  InvalidParams,
  InvalidResponse,
  PacketLoss,
  Expired,
  // other unhandled
  Error = 63,
}

export const monitorDownReasons = enumToObject(MonitorDownReason);

export const baseMonitorParamsSchema = z.object({
  kind: z.string(),
  address: z.string(),
  upWhen: z
    .object({
      latency: z.int().min(0).optional(),
    })
    .optional(),
});

export type BaseMonitorParams = z.infer<typeof baseMonitorParamsSchema>;

export type MonitorResponse<Kind extends string = string> = { kind: Kind; message: string } & (
  | { ok: true; latency: number }
  | { ok: false; reason: MonitorDownReason }
);

export abstract class Monitor<Params extends BaseMonitorParams = BaseMonitorParams> {
  constructor(
    public readonly params: Params,
    public readonly settingsClient: SettingsClient
  ) {}
  abstract check(): Promise<MonitorResponse<Params['kind']>>;
}
