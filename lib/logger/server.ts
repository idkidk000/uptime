import { Console } from 'node:console';
import { relative, sep } from 'node:path';
import { cwd, stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { BaseLogger } from '@/lib/logger';
import { MessageClient } from '@/lib/messaging';

const MAX_PATH_DEPTH = 5;

export class ServerLogger extends BaseLogger {
  #messageClient: MessageClient | null = null;
  constructor(
    ...[param, name]: [messageClient: MessageClient, name?: string] | [importMetaUrl: string, name?: string]
  ) {
    super(
      `${relative(cwd(), fileURLToPath(param instanceof MessageClient ? param.importMetaUrl : param))
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
    if (param instanceof MessageClient) this.#messageClient = param;
  }
  get logSettings() {
    return this.#messageClient?.settings.logging;
  }
}
