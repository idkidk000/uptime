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
