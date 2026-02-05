import { DOMParser } from '@xmldom/xmldom';
import jsonata from 'jsonata';
import xpath from 'xpath';
import { MessageClient } from '@/lib/messaging';
import { MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import { Monitor } from '@/lib/monitor/abc';
import type { HttpMonitorParams } from '@/lib/monitor/http/schema';
import { parseRegex, roundTo } from '@/lib/utils';
import { name, version } from '@/package.json';

const messageClient = new MessageClient(import.meta.url);

export class HttpMonitor extends Monitor<HttpMonitorParams> {
  constructor(params: HttpMonitorParams) {
    super(params, messageClient);
  }
  async check(): Promise<MonitorResponse<'http'>> {
    try {
      const controller = new AbortController();
      const { promise, reject, resolve } = Promise.withResolvers<never>();
      const timeout = setTimeout(
        () => {
          controller.abort();
          reject('timeout');
        },
        (this.params.upWhen?.latency ?? this.messageClient.settings.monitor.defaultTimeout) + 100
      );
      const started = performance.now();
      // fetch will throw on abort signal, though it may not be immediate (i.e. if the remote does not respond at all)
      // Promise.race works around this and leaves the fetch dangling until it hits some unknown timeout
      const response = await Promise.race([
        // NODE_TLS_REJECT_UNAUTHORIZED='0' is set in instrumentation-node.ts since fetch does not have a rejectUnauthorized boolean param like tls and https.get seems to be completely broken
        fetch(this.params.address, {
          headers: { 'User-Agent': `${name} ${version}`, ...this.params.headers },
          signal: controller.signal,
          keepalive: false,
          cache: 'no-store',
        }),
        promise,
      ]);
      const latency = roundTo(performance.now() - started, 3);
      clearTimeout(timeout);
      resolve(null as never);
      if (typeof this.params.upWhen?.statusCode === 'number' && response.status !== this.params.upWhen.statusCode)
        return {
          kind: 'http',
          ok: false,
          reason: MonitorDownReason.InvalidStatus,
          message: `HTTP status ${response.status}`,
        };
      if (typeof this.params.upWhen?.latency === 'number' && latency > this.params.upWhen.latency)
        return {
          kind: 'http',
          ok: false,
          reason: MonitorDownReason.Timeout,
          message: `Connected in ${latency}ms`,
        };
      if (this.params.upWhen?.query) {
        const text = await response.text();
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
              return {
                kind: 'http',
                ok: false,
                reason: MonitorDownReason.QueryNotSatisfied,
                message: `Expected ${this.params.upWhen.query.expected} but found ${result}`,
              };
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
              return {
                kind: 'http',
                ok: false,
                reason: MonitorDownReason.QueryNotSatisfied,
                message: `Expected ${this.params.upWhen.query.expected} but found ${result}`,
              };
            }
            break;
          }
          default: {
            throw new Error(
              `unhandled query kind ${(this.params.upWhen.query satisfies never as { kind: string }).kind}`
            );
          }
        }
      }
      const message =
        [
          `Status code ${response.status}`,
          typeof this.params.upWhen?.latency === 'number' && 'Latency below threshold',
          typeof this.params.upWhen?.query === 'object' && 'Query result correct',
        ]
          .filter((item) => item !== false)
          .join('. ') || 'URL fetched successfully';
      return {
        kind: 'http',
        ok: true,
        latency,
        message,
      };
    } catch (err) {
      if (Error.isError(err) && err.name === 'AbortError')
        return { kind: 'http', ok: false, reason: MonitorDownReason.Timeout, message: err.message };
      return { kind: 'http', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
