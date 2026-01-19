import type { HttpMonitorParams, HttpMonitorResponse } from '@/lib/monitor/http';

export type MonitorKind = 'http';

interface MonitorKindTag {
  kind: MonitorKind;
}

export interface BaseMonitorParams extends MonitorKindTag {}

export interface BaseMonitorResponseUp extends MonitorKindTag {
  ok: true;
  latencyMs: number;
}

export interface BaseMonitorResponseDown extends MonitorKindTag {
  ok: false;
}

export type BaseMonitorResponse = BaseMonitorResponseUp | BaseMonitorResponseDown;

export abstract class Monitor<Params extends BaseMonitorParams, Response extends BaseMonitorResponse> {
  constructor(public readonly params: Params) {}
  abstract check(): Promise<Response>;
}

export type MonitorParams = HttpMonitorParams;

export type MonitorResponse = HttpMonitorResponse;
