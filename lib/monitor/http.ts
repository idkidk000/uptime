import { DOMParser } from '@xmldom/xmldom';
import jsonata from 'jsonata';
import xpath from 'xpath';
import { type BaseMonitorParams, type BaseMonitorResponse, Monitor, MonitorDownReason } from '@/lib/monitor';
import { settings } from '@/lib/settings';
import { parseRegex, roundTo } from '@/lib/utils';
import { name, version } from '@/package.json';

export interface HttpMonitorParams extends BaseMonitorParams {
  kind: 'http';
  headers?: Record<string, string>;
  upWhen: {
    statusCode?: number;
    latency?: number;
    query?:
      | {
          kind: 'jsonata' | 'xpath';
          expression: string;
          expected: unknown;
        }
      | {
          kind: 'regex';
          expression: string;
          expected: boolean;
        };
  };
}

export type HttpMonitorResponse = BaseMonitorResponse & {
  kind: 'http';
};

export class HttpMonitor extends Monitor<HttpMonitorParams, HttpMonitorResponse> {
  async check(): Promise<HttpMonitorResponse> {
    try {
      const controller = new AbortController();
      const { promise, reject, resolve } = Promise.withResolvers<never>();
      const timeout = setTimeout(
        () => {
          controller.abort();
          reject('timeout');
        },
        (this.params.upWhen.latency ?? settings.defaultMonitorTimeout) + 100
      );
      const started = performance.now();
      // fetch will throw on abort signal, though it may not be immediate (i.e. if the remote does not respond at all)
      // Promise.race works around this and leaves the fetch dangling until it hits some unknown timeout
      const response = await Promise.race([
        fetch(this.params.address, {
          headers: { 'User-Agent': `${name} ${version}`, ...this.params.headers },
          signal: controller.signal,
          keepalive: false,
        }),
        promise,
      ]);
      const latency = roundTo(performance.now() - started, 3);
      clearTimeout(timeout);
      resolve(null as never);
      if (typeof this.params.upWhen.statusCode === 'number' && response.status !== this.params.upWhen.statusCode)
        return {
          kind: 'http',
          ok: false,
          reason: MonitorDownReason.InvalidStatus,
          message: `HTTP status ${response.status}`,
        };
      if (typeof this.params.upWhen.latency === 'number' && latency > this.params.upWhen.latency)
        return {
          kind: 'http',
          ok: false,
          reason: MonitorDownReason.Timeout,
          message: `Connected in ${latency}ms`,
        };
      if (this.params.upWhen.query) {
        switch (this.params.upWhen.query.kind) {
          case 'jsonata': {
            const json = await response.json();
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
            const text = await response.text();
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
            const text = await response.text();
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
            throw new Error(`unhandled query kind ${(this.params.upWhen.query as { kind: string }).kind}`);
          }
        }
      }
      return {
        kind: 'http',
        ok: true,
        latency,
        message: 'All checks were successful',
      };
    } catch (err) {
      if (Error.isError(err) && err.name === 'AbortError')
        return { kind: 'http', ok: false, reason: MonitorDownReason.Timeout, message: err.message };
      return { kind: 'http', ok: false, reason: MonitorDownReason.Error, message: String(err) };
    }
  }
}
