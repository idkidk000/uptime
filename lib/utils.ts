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

export function omit<Item extends object, Keys extends Extract<keyof Item, string>, Return extends Omit<Item, Keys>>(
  item: Item,
  keys: Keys[]
): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as Keys))) as Return;
}

export function pick<Item extends object, Keys extends Extract<keyof Item, string>, Return extends Pick<Item, Keys>>(
  item: Item,
  keys: Keys[]
): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as Keys))) as Return;
}

export async function concurrently<Return>(promises: (() => Promise<Return>)[], concurrency = 4): Promise<Return[]> {
  const iterator = promises.values();
  const results: Return[] = [];
  await Promise.all(
    Array.from({ length: concurrency }).fill(
      (async () => {
        for (let item = iterator.next(); !item.done; item = iterator.next()) {
          const result = await item.value();
          results.push(result);
        }
      })()
    )
  );
  return results;
}

export function mean(values: number[]): number {
  return values.reduce((acc, item) => acc + item, 0) / (values.length || 1);
}

export function enumEntriesRev<Enum extends Record<string, number | bigint | boolean | string>>(obj: Enum) {
  return Object.fromEntries(Object.entries(obj).filter(([, val]) => typeof val !== 'string')) as {
    [Key in keyof Enum as Key]: `${Enum[Key]}`;
  };
}

export function enumEntries<Enum extends Record<string, number | bigint | boolean | string>>(obj: Enum) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, val]) => typeof val !== 'string')
      .map(([key, val]) => [val, key])
  ) as {
    [Key in keyof Enum as `${Enum[Key]}`]: Key;
  };
}
