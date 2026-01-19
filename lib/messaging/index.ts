import { rmSync } from 'node:fs';
import { createConnection, createServer, type Socket } from 'node:net';
import { createInterface } from 'node:readline';
import SuperJSON from 'superjson';
import { Logger } from '@/lib/logger';

const SOCKET_ADDR = '.messaging.sock';

type Message =
  | {
      kind: 'action';
      value: 'run-monitor';
    }
  | {
      kind: 'invalidation';
      value: 'group' | 'monitor';
    };

export type MessageWithId = Message & { id: number };
type Callback = (message: MessageWithId) => void | Promise<void>;
type Unsubscribe = () => void;
type SubscriptionKey = `${Message['kind']}.${Message['value']}`;
type InternalMessage =
  | {
      kind: 'subscribe';
      value: SubscriptionKey;
    }
  | { kind: 'unsubscribe'; value: SubscriptionKey }
  | { kind: 'message'; value: MessageWithId };

// TODO: startup handling. maybe buffer all kind:message for n seconds until all subsriptions are in
// TODO: may need a mutex. though createServer is probably older than async so perhaps not
export class MessageServer {
  #logger = new Logger(import.meta.url, 'MessageServer');
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: biome bug
  #subscriptions = new Map<SubscriptionKey, Set<Socket>>();
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: biome bug
  #parseMessage(data: string): InternalMessage | null {
    try {
      const parsed: InternalMessage = SuperJSON.parse(data);
      return parsed;
    } catch {
      this.#logger.warn('unparseable message', data);
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
          const key: SubscriptionKey = `${internalMessage.value.kind}.${internalMessage.value.value}`;
          const subscriptions = this.#subscriptions.get(key);
          if (!subscriptions) return;
          const messageString = `${SuperJSON.stringify(internalMessage.value)}\n`;
          for (const otherClient of subscriptions) otherClient.write(messageString);
          return;
        }
        case 'subscribe': {
          if (!this.#subscriptions.get(internalMessage.value)?.add(client))
            this.#subscriptions.set(internalMessage.value, new Set([client]));
          return;
        }
        case 'unsubscribe': {
          const set = this.#subscriptions.get(internalMessage.value);
          set?.delete(client);
          if (set?.size === 0) this.#subscriptions.delete(internalMessage.value);
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
    this.#server.addListener('listening', () => this.#logger.success('MessageServer listenining on', SOCKET_ADDR));
    this.#server.addListener('error', (err) => this.#logger.error('MessageServer error', err));
    this.#server.listen(SOCKET_ADDR);
  }
  stop() {
    this.#server.close();
    try {
      rmSync(SOCKET_ADDR, { force: true });
    } catch {
      /* empty */
    }
  }
}

// TODO: maybe use AbortSignal instead of returning unsubscribe fn
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
        /* createConnection does not throw or return a promise rejection. instead, you have to handle the `error` event. yay js */
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
            const parsed: MessageWithId = SuperJSON.parse(data);
            const callbacks = this.#subscriptions.get(`${parsed.kind}.${parsed.value}`);
            if (callbacks) for (const callback of callbacks) callback(parsed);
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
  send(message: MessageWithId): void {
    this.#sendInternalMessage({
      kind: 'message',
      value: message,
    });
  }
  //TODO: fix callback type
  subscribe(filter: Message, callback: Callback): Unsubscribe {
    const key = `${filter.kind}.${filter.value}` satisfies SubscriptionKey;
    if (!this.#subscriptions.has(key)) {
      this.#sendInternalMessage({
        kind: 'subscribe',
        value: key,
      });
      this.#subscriptions.set(key, new Set([callback]));
    } else this.#subscriptions.get(key)?.add(callback);
    return () => {
      const set = this.#subscriptions.get(key);
      set?.delete(callback);
      if (set?.size === 0) {
        this.#sendInternalMessage({
          kind: 'unsubscribe',
          value: key,
        });
        this.#subscriptions.delete(key);
      }
    };
  }
}
