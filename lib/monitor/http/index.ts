import { DOMParser } from '@xmldom/xmldom';
import jsonata from 'jsonata';
import xpath from 'xpath';
import { Monitor, MonitorDownReason, type MonitorResponse } from '@/lib/monitor';
import type { HttpMonitorParams } from '@/lib/monitor/http/schema';
import { parseRegex, roundTo } from '@/lib/utils';
import { name, version } from '@/package.json';

// BUG: next isn't listenining on localhost in the container so the mock api monitors don't work
/*
root@uptime-blahaj:/app# curl http://uptime-blahaj:3000/api/mock/json
{"ok":true,"data":"some value"}
root@uptime-blahaj:/app# curl http://uptime-blahaj:3001/api/mock/json
curl: (7) Failed to connect to uptime-blahaj port 3001 after 0 ms: Could not connect to server
root@uptime-blahaj:/app# curl http://127.0.0.1:3000/api/mock/json
curl: (7) Failed to connect to 127.0.0.1 port 3000 after 0 ms: Could not connect to server
root@uptime-blahaj:/app#

generated server.js has a hostname of '0.0.0.0' which should mean all addresses, but that is not what's happnening. the nextjs docs continue to be poorly indexed and unsearchable

root@uptime-blahaj:/app# ss -tulpen
Netid      State       Recv-Q      Send-Q             Local Address:Port             Peer Address:Port      Process
tcp        LISTEN      0           511                   172.17.0.2:3000                  0.0.0.0:*                       uid:1000 ino:1929501 sk:15 cgroup:/ <->
*/
export class HttpMonitor extends Monitor<HttpMonitorParams> {
  async check(): Promise<MonitorResponse<'http'>> {
    try {
      const controller = new AbortController();
      const { promise, reject, resolve } = Promise.withResolvers<never>();
      const timeout = setTimeout(
        () => {
          controller.abort();
          reject('timeout');
        },
        (this.params.upWhen?.latency ?? this.settingsClient.current.monitor.defaultTimeout) + 100
      );
      const started = performance.now();
      // fetch will throw on abort signal, though it may not be immediate (i.e. if the remote does not respond at all)
      // Promise.race works around this and leaves the fetch dangling until it hits some unknown timeout
      const response = await Promise.race([
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
