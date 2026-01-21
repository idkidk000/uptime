import type { HttpMonitorParams, HttpMonitorResponse } from '@/lib/monitor/http';

// TODO: this may have to be a plain string
export type MonitorKind = 'http';

interface MonitorKindTag {
  kind: MonitorKind;
}

export interface BaseMonitorUpWhen {
  upWhen: {
    latency?: number;
  };
}

export interface BaseMonitorParams extends MonitorKindTag, BaseMonitorUpWhen {}

export interface BaseMonitorResponseUp extends MonitorKindTag {
  ok: true;
  latency: number;
}

export enum MonitorDownReason {
  Timeout,
  InvalidStatus,
  QueryNotSatisfied,
  // other unhandled
  Error = 63,
}

export interface BaseMonitorResponseDown extends MonitorKindTag {
  ok: false;
  reason: MonitorDownReason;
  result: unknown;
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

export type MonitorParams = HttpMonitorParams;

export type MonitorResponse = HttpMonitorResponse;
