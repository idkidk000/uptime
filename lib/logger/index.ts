// TODO: level and source filtering once i have a config source

import { Console } from 'node:console';
import { relative, sep } from 'node:path';
import { cwd, stderr, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { toLocalIso } from '@/lib/date';

const MAX_PATH_DEPTH = 3;

export const ansiStyles = {
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },
  fgIntense: {
    black: '\x1b[90m',
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    blue: '\x1b[94m',
    purple: '\x1b[95m',
    cyan: '\x1b[96m',
    white: '\x1b[97m',
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    purple: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  },
  bgIntense: {
    black: '\x1b[100m',
    red: '\x1b[101m',
    green: '\x1b[102m',
    yellow: '\x1b[103m',
    blue: '\x1b[104m',
    purple: '\x1b[105m',
    cyan: '\x1b[106m',
    white: '\x1b[107m',
  },
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  reset: '\x1b[0m',
  clear: '\x1bc',
} as const;

const levels = {
  'Debug:High': { colour: ansiStyles.fgIntense.blue, method: 'debug', value: 0 },
  'Debug:Med': { colour: ansiStyles.fgIntense.blue, method: 'debug', value: 1 },
  'Debug:Low': { colour: ansiStyles.fgIntense.blue, method: 'debug', value: 2 },
  Info: { colour: ansiStyles.fgIntense.cyan, method: 'info', value: 3 },
  Success: { colour: ansiStyles.fgIntense.green, method: 'info', value: 4 },
  Warn: { colour: ansiStyles.fgIntense.yellow, method: 'warn', value: 5 },
  Error: { colour: ansiStyles.fgIntense.red, method: 'error', value: 6 },
} as const;
type LevelName = keyof typeof levels;

const console = new Console({
  colorMode: true,
  inspectOptions: {
    breakLength: 300,
    compact: true,
    depth: 10,
    maxStringLength: 150,
    numericSeparator: true,
    sorted: false,
  },
  stderr,
  stdout,
});

export enum LogDate {
  None,
  Time,
  DateTime,
}

export class Logger {
  #name: string;
  #levelValue: number;
  #showDate: LogDate;
  #showLevel: boolean;
  #makePrefix(levelName: LevelName, colour: string) {
    const parts = [
      this.#showDate === LogDate.DateTime
        ? toLocalIso(Date.now(), { endAt: 's' })
        : this.#showDate === LogDate.Time
          ? toLocalIso(Date.now(), { endAt: 's', showDate: false })
          : null,
      this.#showLevel ? levelName : null,
      this.#name || null,
    ].filter((item) => item !== null);
    if (parts.length) return `${ansiStyles.bold}${colour}[${parts.join(' ')}]${ansiStyles.reset}`;
    return '';
  }
  #log(levelName: LevelName | null, ...message: unknown[]) {
    if (levelName === null) console.log(...message);
    else {
      const { colour, method, value: level } = levels[levelName];
      if (level < this.#levelValue) return;
      const prefix = this.#makePrefix(levelName, colour);
      console[method](prefix, ...message);
    }
  }
  constructor(
    importMetaUrl: string,
    name?: string,
    {
      logLevel = 'Debug:High',
      showDate = LogDate.None,
      showLevel = true,
      showPath = true,
    }: {
      logLevel?: LevelName | number;
      showDate?: LogDate;
      showPath?: boolean;
      showLevel?: boolean;
    } = {}
  ) {
    this.#name = `${showPath ? relative(cwd(), fileURLToPath(importMetaUrl)).split(sep).slice(-MAX_PATH_DEPTH).join(sep) : ''}${showPath && name ? ':' : ''}${
      name ?? ''
    }`;
    this.#levelValue = typeof logLevel === 'number' ? logLevel : levels[logLevel].value;
    this.#showDate = showDate;
    this.#showLevel = showLevel;
  }
  debugHigh(...message: unknown[]) {
    this.#log('Debug:High', ...message);
  }
  debugMed(...message: unknown[]) {
    this.#log('Debug:Med', ...message);
  }
  debugLow(...message: unknown[]) {
    this.#log('Debug:Low', ...message);
  }
  info(...message: unknown[]) {
    this.#log('Info', ...message);
  }
  success(...message: unknown[]) {
    this.#log('Success', ...message);
  }
  warn(...message: unknown[]) {
    this.#log('Warn', ...message);
  }
  error(...message: unknown[]) {
    this.#log('Error', ...message);
  }
  setLevel(logLevel: LevelName | number) {
    this.#levelValue = typeof logLevel === 'number' ? logLevel : levels[logLevel].value;
  }
  plain(...message: unknown[]) {
    this.#log(null, ...message);
  }
  makeChild(name: string): Logger {
    const logger = new Logger(import.meta.url);
    logger.#levelValue = this.#levelValue;
    logger.#name = `${this.#name}:${name}`;
    logger.#showDate = this.#showDate;
    logger.#showLevel = this.#showLevel;
    return logger;
  }
  clear(): void {
    console.clear();
  }
}
