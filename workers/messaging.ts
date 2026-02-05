import { MessageServer } from '@/lib/messaging';

let messageServer: MessageServer;

export async function start() {
  messageServer = await MessageServer.newAsync();
}

export function stop() {
  messageServer?.stop();
}
