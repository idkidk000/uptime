import { type ComponentProps, useCallback, useRef, type FocusEvent, useEffect } from 'react';
import { cn } from '@/lib/utils';

const RE_MATCH = /^\s*(?<key>[^:\s]+)\s*:\s*(?<val>.+)\s*$/gm;

export function InputRecord<
  AllowEmpty extends boolean = false,
  KeyType extends 'string' | 'number' = 'string',
  ValueType extends 'string' | 'number' = 'string',
>({
  className,
  onValueChange,
  allowEmpty,
  value,
  rows = 'auto',
  cols = 1,
  keyType,
  valueType,
  onBlur,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'rows'> & {
  onValueChange: (
    value:
      | Record<KeyType extends 'number' ? number : string, ValueType extends 'number' ? number : string>
      | (AllowEmpty extends true ? undefined : never)
  ) => void;
  placeholder: string;
  value:
    | Record<KeyType extends 'number' ? number : string, ValueType extends 'number' ? number : string>
    | (AllowEmpty extends true ? undefined : never);
  allowEmpty?: AllowEmpty;
  keyType?: KeyType;
  valueType?: ValueType;
  rows?: number | 'auto';
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const updateControl = useCallback(
    (
      parsed:
        | Record<KeyType extends 'number' ? number : string, ValueType extends 'number' ? number : string>
        | undefined
    ) => {
      if (!ref.current) return;
      const asString =
        typeof parsed === 'undefined'
          ? ''
          : Object.entries(parsed)
              .map(([key, val]) => `${key}: ${val}`)
              .join('\n');
      ref.current.value = asString;
      if (rows === 'auto') ref.current.rows = asString.split('\n').length + 1;
    },
    [rows]
  );

  useEffect(() => updateControl(value), [updateControl, value]);

  const handleUpdate = useCallback(() => {
    if (!ref.current) return;
    const parsed = Object.fromEntries(
      ref.current.value
        .matchAll(RE_MATCH)
        .filter(
          (match): match is typeof match & { groups: Record<'key' | 'val', string> } =>
            typeof match.groups !== 'undefined'
        )
        .map((match) => {
          const { key, val } = match.groups;
          return [keyType === 'number' ? Number(key) : key, valueType === 'number' ? Number(val) : val];
        })
    ) as Record<KeyType extends 'number' ? number : string, ValueType extends 'number' ? number : string>;
    onValueChange(
      (allowEmpty && Object.keys(parsed).length === 0 ? undefined : parsed) as
        | Record<KeyType extends 'number' ? number : string, ValueType extends 'number' ? number : string>
        | (AllowEmpty extends true ? undefined : never)
    );
    updateControl(parsed);
  }, [allowEmpty, onValueChange, keyType, updateControl, valueType]);

  // biome-ignore format: no
  const handleBlur = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
    handleUpdate();
    onBlur?.(event);
  }, [onBlur, handleUpdate]);

  const handleChange = useCallback(() => {
    if (rows !== 'auto' || !ref.current) return;
    ref.current.rows = ref.current.value.split('\n').length + 1;
  }, [rows]);

  return (
    <textarea
      ref={ref}
      className={cn(
        'rounded-2xl shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2 resize-none',
        className
      )}
      onBlur={handleBlur}
      onChange={handleChange}
      rows={rows === 'auto' ? undefined : rows}
      cols={cols}
      {...props}
    />
  );
}
