const RE_PARSE = /\/(?<expression>.*)\/(?<flags>[a-z]+)?/;

export function parseRegex(value: string): RegExp {
  const parsed = RE_PARSE.exec(value);
  if (parsed?.groups) return new RegExp(parsed.groups.expression, parsed.groups.flags);
  return new RegExp(value);
}

export function roundTo(value: number, digits: number) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export const omit = <T extends object, K extends Extract<keyof T, string>, R extends Omit<T, K>>(
  item: T,
  keys: K[]
): R => Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as K))) as R;

export const pick = <T extends object, K extends Extract<keyof T, string>, R extends Pick<T, K>>(
  item: T,
  keys: K[]
): R => Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as K))) as R;
