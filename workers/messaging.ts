import { MessageServer } from '@/lib/messaging';

let messageServer: MessageServer;

export function start() {
  messageServer = new MessageServer();
}

export function stop() {
  messageServer?.stop();
}
