import { Console } from 'node:console';
import { relative, sep } from 'node:path';
import { cwd, stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { BaseLogger, type LogLevelName, logLevels } from '@/lib/logger';
import type { MessageServer } from '@/lib/messaging';
import { typedEntries } from '@/lib/utils';

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
  suppress(levelValue: number): boolean {
    const overrides = this.#messageServer.settingsMessage.data.logging.overrides;
    let levelName: LogLevelName | undefined = this.#messageServer.settingsMessage.data.logging.rootLevel;
    if (overrides) {
      const override = typedEntries(overrides)
        .toSorted(([a], [b]) => b.length - a.length)
        .find(([key]) => key.startsWith(this.name));
      if (override) levelName = override[1];
    }
    if (!levelName) return false;
    if (levelValue >= logLevels[levelName].value) return false;
    return true;
  }
}
