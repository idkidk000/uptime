import { rmSync } from 'node:fs';
import { createConnection, createServer, type Socket } from 'node:net';
import { sep } from 'node:path';
import { createInterface } from 'node:readline';
import SuperJSON from 'superjson';
import type { ServiceStatus } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import type { MonitorDownReason } from '@/lib/monitor';

// use a unix socket on systems which support it. fallback to tcp/ip and hope we don't have a port collision
const SOCKET_ADDR = '.messaging.sock';
const SOCKET_FALLBACK_PORT = 33625;
const SOCKET_FALLBACK_ADDR = '127.0.0.1';
// only needs to be this high in dev
const STARTUP_CACHE_MILLIS = 15_000;

// actions which can only be carried out by the backend workers. most tasks should be fine in server actions
export type ActionKind = 'check-service';
export type InvalidationKind = 'group' | 'service-config' | 'service-history' | 'service-state' | 'settings';
export type ToastMessage =
  | {
      cat: 'toast';
      kind: 'status';
      id: number;
      name: string;
      status: ServiceStatus;
      message: string;
    }
  | {
      cat: 'toast';
      kind: 'message';
      title: string;
      message: string;
    };
export type StatusMessage = {
  cat: 'status';
  kind: ServiceStatus;
  id: number;
  name: string;
  reason?: MonitorDownReason;
  message: string;
};
export type BusMessage =
  | {
      cat: 'action';
      kind: ActionKind;
      id: number;
    }
  | {
      cat: 'invalidation';
      kind: InvalidationKind;
      id: number;
    }
  | ToastMessage
  | StatusMessage;

// FIXME: the generated type is correct but the def is horrible and keys have to be asserted, which defeats the point of this. may need to refactor Message
type SubscriptionKey = BusMessage extends infer M
  ? M extends { cat: infer C extends string }
    ? M extends { kind: infer K extends string | number }
      ? `${C}.${K}` | `${C}.`
      : never
    : never
  : never;
type Callback = (message: BusMessage) => void | Promise<void>;
type Unsubscribe = () => void;
type InternalMessage =
  | {
      kind: 'subscribe';
      key: SubscriptionKey;
    }
  | { kind: 'unsubscribe'; key: SubscriptionKey }
  | { kind: 'message'; msg: BusMessage };

function isUnixLike() {
  return sep === '/';
}

export class MessageServer {
  #logger = new ServerLogger(import.meta.url, 'MessageServer');
  #subscriptions = new Map<SubscriptionKey, Set<Socket>>();
  #cache: BusMessage[] = [];
  /** cache is in use while this is not null */
  #cacheTimeout: NodeJS.Timeout | null;
  #parseMessage(data: string): InternalMessage | null {
    try {
      const parsed: InternalMessage = SuperJSON.parse(data);
      return parsed;
    } catch {
      this.#logger.warn('unparsable message', data);
      return null;
    }
  }
  #server = createServer((client) => {
    client.addListener('error', (err) => {
      this.#logger.warn('socket error', err);
    });
    const readline = createInterface(client);
    readline.addListener('line', (data) => {
      this.#logger.debugLow('received', data);
      const internalMessage = this.#parseMessage(data);
      if (!internalMessage) return;
      this.#logger.debugLow('received', internalMessage);
      switch (internalMessage.kind) {
        case 'message': {
          if (this.#cacheTimeout !== null) this.#cache.push(internalMessage.msg);
          const subscriptions = [
            ...(this.#subscriptions.get(`${internalMessage.msg.cat}.`) ?? []),
            ...(this.#subscriptions.get(`${internalMessage.msg.cat}.${internalMessage.msg.kind}` as SubscriptionKey) ??
              []),
          ];
          if (!subscriptions.length) return;
          const messageString = `${SuperJSON.stringify(internalMessage.msg)}\n`;
          for (const otherClient of subscriptions) otherClient.write(messageString);
          return;
        }
        case 'subscribe': {
          if (!this.#subscriptions.get(internalMessage.key)?.add(client))
            this.#subscriptions.set(internalMessage.key, new Set([client]));
          if (this.#cacheTimeout === null) return;
          for (const cachedMessage of this.#cache) {
            if (
              internalMessage.key === `${cachedMessage.cat}.` ||
              internalMessage.key === `${cachedMessage.cat}.${cachedMessage.kind}`
            )
              client.write(`${SuperJSON.stringify(cachedMessage)}\n`);
          }
          return;
        }
        case 'unsubscribe': {
          const set = this.#subscriptions.get(internalMessage.key);
          set?.delete(client);
          if (set?.size === 0) this.#subscriptions.delete(internalMessage.key);
          return;
        }
        default: {
          throw new Error(`unhandled internal message kind ${(internalMessage as { kind: string }).kind}`);
        }
      }
    });
    readline.addListener('close', () => {
      for (const [key, subscriptions] of this.#subscriptions.entries()) {
        subscriptions.delete(client);
        if (subscriptions.size === 0) this.#subscriptions.delete(key);
      }
    });
  });
  constructor() {
    try {
      rmSync(SOCKET_ADDR, { force: true });
    } catch {
      /* empty */
    }
    this.#cacheTimeout = setTimeout(() => {
      this.#cache = [];
    }, STARTUP_CACHE_MILLIS);
    this.#server.addListener('listening', () =>
      this.#logger.success(
        'MessageServer listening on',
        isUnixLike() ? SOCKET_ADDR : `${SOCKET_FALLBACK_ADDR}:${SOCKET_FALLBACK_PORT}`
      )
    );
    this.#server.addListener('error', (err) => this.#logger.error('MessageServer error', err));
    if (isUnixLike()) this.#server.listen(SOCKET_ADDR);
    else this.#server.listen(SOCKET_FALLBACK_PORT, SOCKET_FALLBACK_ADDR);
  }
  stop() {
    this.#server.close();
    if (this.#cacheTimeout !== null) clearTimeout(this.#cacheTimeout);
    try {
      rmSync(SOCKET_ADDR, { force: true });
    } catch {
      /* empty */
    }
  }
}

export class MessageClient {
  #socket: Socket | null = null;
  #subscriptions = new Map<SubscriptionKey, Set<Callback>>();
  #queue: string[] = [];
  #logger: ServerLogger;
  constructor(public readonly importMetaUrl: string) {
    this.#logger = new ServerLogger(importMetaUrl, 'MessageClient');
    // FIXME: dispose of failed sockets properly
    const interval = setInterval(() => {
      const socket = isUnixLike()
        ? createConnection(SOCKET_ADDR)
        : createConnection(SOCKET_FALLBACK_PORT, SOCKET_FALLBACK_ADDR);
      socket.addListener('error', (err) => {
        this.#logger.debugLow('MessageClient error', err);
      });
      socket.addListener('ready', () => {
        this.#logger.success('MessageClient connected');
        this.#socket = socket;
        clearInterval(interval);
        for (const item of this.#queue) {
          this.#logger.debugLow('pushing queued message', item);
          socket.write(item);
        }
        this.#queue = [];
        const readline = createInterface(this.#socket);
        readline.addListener('line', (data) => {
          this.#logger.debugLow('received', data);
          try {
            const parsed: BusMessage = SuperJSON.parse(data);
            for (const callback of [
              ...(this.#subscriptions.get(`${parsed.cat}.${parsed.kind}` as SubscriptionKey) ?? []),
              ...(this.#subscriptions.get(`${parsed.cat}.`) ?? []),
            ])
              callback(parsed);
          } catch (err) {
            this.#logger.error('could not parse message', err);
          }
        });
      });
    }, 100);
  }
  #sendInternalMessage(internalMessage: InternalMessage) {
    const messageString = `${SuperJSON.stringify(internalMessage)}\n`;
    this.#logger.debugLow('sendInternalMessage', messageString, this.#socket === null ? 'disconnected' : 'connected?');
    if (this.#socket) this.#socket.write(messageString);
    else this.#queue.push(messageString);
  }
  send(...messages: BusMessage[]): void {
    for (const message of messages) this.#sendInternalMessage({ kind: 'message', msg: message });
  }
  subscribe<Filter extends Pick<BusMessage, 'cat' | 'kind'> | Pick<BusMessage, 'cat'>>(
    filter: Filter,
    callback: (message: Extract<BusMessage, Filter>) => void | Promise<void>
  ): Unsubscribe {
    const key = `${filter.cat}.${'kind' in filter ? filter.kind : ''}` as SubscriptionKey;
    if (!this.#subscriptions.has(key)) {
      this.#sendInternalMessage({
        kind: 'subscribe',
        key: key,
      });
      this.#subscriptions.set(key, new Set([callback as Callback]));
    } else this.#subscriptions.get(key)?.add(callback as Callback);
    return () => {
      const set = this.#subscriptions.get(key);
      set?.delete(callback as Callback);
      if (set?.size === 0) {
        this.#sendInternalMessage({
          kind: 'unsubscribe',
          key: key,
        });
        this.#subscriptions.delete(key);
      }
    };
  }
}
