import { Console } from 'node:console';
import { relative, sep } from 'node:path';
import { cwd, stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { BaseLogger } from '@/lib/logger';
import type { MessageServer } from '@/lib/messaging';

const MAX_PATH_DEPTH = 5;

export class MessageServerLogger extends BaseLogger {
  #messageServer: MessageServer;
  constructor(importMetaUrl: string, messageServer: MessageServer, name?: string) {
    super(
      `${relative(cwd(), fileURLToPath(importMetaUrl))
        .split(sep)
        .slice(-MAX_PATH_DEPTH)
        .join(sep)}${name ? `:${name}` : ''}`,
      new Console({
        colorMode: true,
        inspectOptions: {
          breakLength: 300,
          compact: true,
          depth: 10,
          maxStringLength: 1500,
          numericSeparator: true,
          sorted: false,
        },
        stderr,
        stdout,
      }),
      true
    );
    this.#messageServer = messageServer;
  }
  get logSettings() {
    return this.#messageServer.settingsMessage.data.logging;
  }
}
