import type { Monitor } from '@/lib/monitor';
import { DnsMonitor } from '@/lib/monitor/dns';
import { DomainMonitor } from '@/lib/monitor/domain';
import { HttpMonitor } from '@/lib/monitor/http';
import { PingMonitor } from '@/lib/monitor/ping';
import type { MonitorParams } from '@/lib/monitor/schema';
import { SslMonitor } from '@/lib/monitor/ssl';
import { TcpMonitor } from '@/lib/monitor/tcp';
import type { SettingsClient } from '@/lib/settings';

export function getMonitor<Params extends MonitorParams>(
  params: Params,
  settingsClient: SettingsClient
): Monitor<Params> {
  if (params.kind === 'dns') return new DnsMonitor(params, settingsClient) as Monitor<Params>;
  if (params.kind === 'domain') return new DomainMonitor(params, settingsClient) as Monitor<Params>;
  if (params.kind === 'http') return new HttpMonitor(params, settingsClient) as Monitor<Params>;
  if (params.kind === 'ping') return new PingMonitor(params, settingsClient) as Monitor<Params>;
  if (params.kind === 'ssl') return new SslMonitor(params, settingsClient) as Monitor<Params>;
  if (params.kind === 'tcp') return new TcpMonitor(params, settingsClient) as Monitor<Params>;
  throw new Error(`unhandled monitor kind: ${(params as { kind: string }).kind}`);
}
