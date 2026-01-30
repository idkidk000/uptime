import { DOMParser } from '@xmldom/xmldom';
import jsonata from 'jsonata';
import mqtt from 'mqtt';
import xpath from 'xpath';
import { ServerLogger } from '@/lib/logger/server';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { MqttMonitorParams } from '@/lib/monitor/mqtt/schema';
import { parseRegex, roundTo } from '@/lib/utils';

const RE_BARE_HOST = /^(?:.*:\/\/)?(?<host>[a-z\d.]+)(:(?<port>\d+))?/;

const logger = new ServerLogger(import.meta.url);

export class MqttMonitor extends Monitor<MqttMonitorParams> {
  async check(): Promise<MonitorResponse<'mqtt'>> {
    try {
      const match = RE_BARE_HOST.exec(this.params.address);
      if (!match?.groups)
        return {
          kind: 'mqtt',
          ok: false,
          reason: MonitorDownReason.InvalidParams,
          message: `Could not parse domain ${this.params.address}`,
        };
      // using the non-async mqtt api seems easier to get at each possible failure mode
      const { promise, resolve, reject } = Promise.withResolvers<MonitorResponse<'mqtt'>>();
      const timeoutMs = this.params.upWhen?.latency ?? this.settingsClient.current.monitor.defaultTimeout;
      const started = performance.now();
      const timeout = setTimeout(() => {
        resolve({
          kind: 'mqtt',
          ok: false,
          reason: MonitorDownReason.Timeout,
          message: `Timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);
      const client = mqtt.connect({
        password: this.params.password,
        auth: this.params.username,
        port: this.params.port,
        host: match.groups.host,
      });
      client.once('error', reject);
      client.once('connect', () => client.subscribe(this.params.topic));
      client.once('message', async (_, payload) => {
        try {
          const latency = roundTo(performance.now() - started, 3);
          const text = payload.toString('utf-8');
          logger.debugLow({ message: text, latency });
          if (typeof this.params.upWhen?.latency === 'number' && latency > this.params.upWhen.latency) {
            return resolve({
              kind: 'mqtt',
              ok: false,
              reason: MonitorDownReason.Timeout,
              message: `Received message in ${latency}ms`,
            });
          }
          if (this.params.upWhen?.query) {
            switch (this.params.upWhen.query.kind) {
              case 'jsonata': {
                let json: unknown;
                try {
                  json = JSON.parse(text);
                } catch {
                  json = JSON.parse(`{"value": "${text}"}`);
                }
                const expression = jsonata(this.params.upWhen.query.expression);
                const result = await expression.evaluate(json);
                if (result !== this.params.upWhen.query.expected) {
                  return resolve({
                    kind: 'mqtt',
                    ok: false,
                    reason: MonitorDownReason.QueryNotSatisfied,
                    message: `Expected ${this.params.upWhen.query.expected} but found ${result}`,
                  });
                }
                break;
              }
              case 'regex': {
                const rawResult = parseRegex(this.params.upWhen.query.expression).exec(text);
                const result = !!rawResult;
                if (result !== this.params.upWhen.query.expected)
                  return {
                    kind: 'http',
                    ok: false,
                    reason: MonitorDownReason.QueryNotSatisfied,
                    message: `Expected ${this.params.upWhen.query.expected} but found ${rawResult}`,
                  };
                break;
              }
              case 'xpath': {
                const dom = new DOMParser({
                  errorHandler: () => {
                    /* spams errors to stdout otherwise. i don't care if the source has syntax errors */
                  },
                }).parseFromString(text);
                const rawResult = xpath.select(this.params.upWhen.query.expression, dom);
                const result =
                  typeof rawResult === 'string' || typeof rawResult === 'number' || typeof rawResult === 'boolean'
                    ? rawResult
                    : String(rawResult);
                if (result !== this.params.upWhen.query.expected) {
                  return resolve({
                    kind: 'mqtt',
                    ok: false,
                    reason: MonitorDownReason.QueryNotSatisfied,
                    message: `Expected ${this.params.upWhen.query.expected} but found ${result}`,
                  });
                }
                break;
              }
              default:
                return resolve({
                  kind: 'mqtt',
                  ok: false,
                  reason: MonitorDownReason.InvalidParams,
                  message: `Invalid query kind: ${(this.params.upWhen.query satisfies never as { kind: string }).kind}`,
                });
            }
          }
          const message =
            [
              typeof this.params.upWhen?.latency === 'number' && 'Latency below threshold',
              typeof this.params.upWhen?.query === 'object' && 'Query result correct',
            ]
              .filter((item) => item !== false)
              .join('. ') || 'MQTT message received successfully';
          resolve({ kind: 'mqtt', ok: true, message, latency });
        } catch (err) {
          // outer will catch it
          reject(err);
        }
      });
      const response = await promise;
      clearTimeout(timeout);
      client.end();
      return response;
    } catch (err) {
      return { kind: 'mqtt', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
