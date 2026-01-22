import { rmSync } from 'node:fs';
import { createConnection, createServer, type Socket } from 'node:net';
import { createInterface } from 'node:readline';
import SuperJSON from 'superjson';
import type { ServiceState } from '@/lib/drizzle/schema';
import { Logger } from '@/lib/logger';

const SOCKET_ADDR = '.messaging.sock';
// only needs to be this high in dev
const STARTUP_CACHE_MILLIS = 15_000;

// actions which can only be carried out by the backend workers. most tasks should be fine in server actions
export type ActionKind = 'test-service';
export type InvalidationKind = 'group' | 'service-config' | 'service-history' | 'service-state';
type Message =
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
  | {
      cat: 'toast';
      kind: 'state';
      id: number;
      state: ServiceState;
      message: string;
    }
  | {
      cat: 'toast';
      kind: 'message';
      message: string;
    };
// FIXME: the generated type is correct but the def is horrible and keys have to be asserted, which defeats the point of this. may need to refactor Message
type SubscriptionKey = Message extends infer M
  ? M extends { cat: infer C extends string }
    ? M extends { kind: infer K extends string }
      ? `${C}.${K}` | `${C}.`
      : never
    : never
  : never;
type Callback = (message: Message) => void | Promise<void>;
type Unsubscribe = () => void;
type InternalMessage =
  | {
      kind: 'subscribe';
      key: SubscriptionKey;
    }
  | { kind: 'unsubscribe'; key: SubscriptionKey }
  | { kind: 'message'; msg: Message };

// TODO: startup handling. maybe buffer all kind:message for n seconds until all subscriptions are in
export class MessageServer {
  #logger = new Logger(import.meta.url, 'MessageServer');
  #subscriptions = new Map<SubscriptionKey, Set<Socket>>();
  #cache: Message[] = [];
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
          if (!subscriptions) return;
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
    this.#server.addListener('listening', () => this.#logger.success('MessageServer listening on', SOCKET_ADDR));
    this.#server.addListener('error', (err) => this.#logger.error('MessageServer error', err));
    this.#server.listen(SOCKET_ADDR);
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
  #logger: Logger;
  constructor(public readonly importMetaUrl: string) {
    this.#logger = new Logger(importMetaUrl, 'MessageClient');
    const interval = setInterval(() => {
      const socket = createConnection(SOCKET_ADDR);
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
            const parsed: Message = SuperJSON.parse(data);
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
  send(...messages: Message[]): void {
    for (const message of messages) this.#sendInternalMessage({ kind: 'message', msg: message });
  }
  subscribe<Filter extends Pick<Message, 'cat' | 'kind'> | Pick<Message, 'cat'>>(
    filter: Filter,
    callback: (message: Extract<Message, Filter>) => void | Promise<void>
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
