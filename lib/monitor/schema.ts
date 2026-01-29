import z from 'zod';
import { dnsMonitorParamsSchema } from '@/lib/monitor/dns/schema';
import { domainMonitorParamsSchema } from '@/lib/monitor/domain/schema';
import { httpMonitorParamsSchema } from '@/lib/monitor/http/schema';
import { mqttMonitorParamsSchema } from '@/lib/monitor/mqtt/schema';
import { pingMonitorParamsSchema } from '@/lib/monitor/ping/schema';
import { sslMonitorParamsSchema } from '@/lib/monitor/ssl/schema';
import { tcpMonitorParamsSchema } from '@/lib/monitor/tcp/schema';

export const monitorParamsSchema = z.discriminatedUnion('kind', [
  dnsMonitorParamsSchema,
  domainMonitorParamsSchema,
  httpMonitorParamsSchema,
  mqttMonitorParamsSchema,
  pingMonitorParamsSchema,
  sslMonitorParamsSchema,
  tcpMonitorParamsSchema,
]);

export type MonitorParams = z.infer<typeof monitorParamsSchema>;

export type MonitorKind = MonitorParams['kind'];

export const monitorKinds: MonitorKind[] = ['dns', 'domain', 'http', 'mqtt', 'ping', 'ssl', 'tcp'];
