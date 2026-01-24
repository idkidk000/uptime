import { Console } from 'node:console';
import { relative, sep } from 'node:path';
import { cwd, stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { BaseLogger } from '@/lib/logger';

const MAX_PATH_DEPTH = 3;

export class ServerLogger extends BaseLogger {
  constructor(importMetaUrl: string, name?: string) {
    super(
      `${relative(cwd(), fileURLToPath(importMetaUrl)).split(sep).slice(-MAX_PATH_DEPTH).join(sep)}${name ? `:${name}` : ''}`,
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
  }
}
