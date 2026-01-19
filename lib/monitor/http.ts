import { DOMParser } from '@xmldom/xmldom';
import jsonata from 'jsonata';
import xpath from 'xpath';
import {
  type BaseMonitorParams,
  type BaseMonitorResponseDown,
  type BaseMonitorResponseUp,
  Monitor,
} from '@/lib/monitor';
import { parseRegex, roundTo } from '@/lib/utils';

export interface HttpMonitorParams extends BaseMonitorParams {
  kind: 'http';
  url: string;
  headers?: Record<string, string>;
  upWhen: {
    statusCode?: number;
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

export enum HttpMonitorDownReason {
  IncorrectStatus,
  QueryNotSatisfied,
  Error,
}

interface HttpMonitorResponseUp extends BaseMonitorResponseUp {
  kind: 'http';
}

interface HttpMonitorResponseDown extends BaseMonitorResponseDown {
  kind: 'http';
  reason: HttpMonitorDownReason;
  result: unknown;
}

export type HttpMonitorResponse = HttpMonitorResponseUp | HttpMonitorResponseDown;

export class HttpMonitor extends Monitor<HttpMonitorParams, HttpMonitorResponse> {
  async check(): Promise<HttpMonitorResponse> {
    try {
      const started = performance.now();
      const response = await fetch(this.params.url, { headers: this.params.headers });
      const latency = roundTo(performance.now() - started, 3);
      if (typeof this.params.upWhen.statusCode === 'number' && response.status !== this.params.upWhen.statusCode)
        return {
          kind: 'http',
          ok: false,
          reason: HttpMonitorDownReason.IncorrectStatus,
          result: response.status,
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
                reason: HttpMonitorDownReason.QueryNotSatisfied,
                result,
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
                reason: HttpMonitorDownReason.QueryNotSatisfied,
                result: rawResult,
              };
            break;
          }
          case 'xpath': {
            const text = await response.text();
            const dom = new DOMParser().parseFromString(text);
            const rawResult = xpath.select(this.params.upWhen.query.expression, dom);
            const result =
              typeof rawResult === 'string' || typeof rawResult === 'number' || typeof rawResult === 'boolean'
                ? rawResult
                : String(rawResult);
            if (result !== this.params.upWhen.query.expected) {
              return {
                kind: 'http',
                ok: false,
                reason: HttpMonitorDownReason.QueryNotSatisfied,
                result,
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
      };
    } catch (err) {
      return { kind: 'http', ok: false, reason: HttpMonitorDownReason.Error, result: String(err) };
    }
  }
}
