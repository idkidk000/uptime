import type { DnsMonitorParams, DnsMonitorResponse } from '@/lib/monitor/dns';
import type { HttpMonitorParams, HttpMonitorResponse } from '@/lib/monitor/http';
import type { PingMonitorParams, PingMonitorResponse } from '@/lib/monitor/ping';
import type { SslMonitorParams, SslMonitorResponse } from '@/lib/monitor/ssl';
import type { TcpMonitorParams, TcpMonitorResponse } from '@/lib/monitor/tcp';
import { enumToObject } from '@/lib/utils';

interface MonitorKindTag {
  kind: string;
}

export interface BaseMonitorUpWhen {
  upWhen: {
    latency?: number;
  };
}

export interface BaseMonitorParams extends MonitorKindTag, BaseMonitorUpWhen {
  address: string;
}

export interface BaseMonitorResponseUp extends MonitorKindTag {
  ok: true;
  latency: number;
  message: string;
}

export enum MonitorDownReason {
  Timeout,
  InvalidStatus,
  QueryNotSatisfied,
  InvalidParams,
  InvalidResponse,
  PacketLoss,
  // other unhandled
  Error = 63,
}

export const monitorDownReasons = enumToObject(MonitorDownReason);

export interface BaseMonitorResponseDown extends MonitorKindTag {
  ok: false;
  reason: MonitorDownReason;
  message: string;
}

export type BaseMonitorResponse = BaseMonitorResponseUp | BaseMonitorResponseDown;

// FIXME: probably need to add MonitorKind to the generic
export abstract class Monitor<
  Params extends BaseMonitorParams = BaseMonitorParams,
  Response extends BaseMonitorResponse = BaseMonitorResponse,
> {
  constructor(public readonly params: Params) {}
  abstract check(): Promise<Response>;
}

export type MonitorParams =
  | HttpMonitorParams
  | DnsMonitorParams
  | PingMonitorParams
  | TcpMonitorParams
  | SslMonitorParams;
export type MonitorResponse =
  | HttpMonitorResponse
  | DnsMonitorResponse
  | PingMonitorResponse
  | TcpMonitorResponse
  | SslMonitorResponse;
