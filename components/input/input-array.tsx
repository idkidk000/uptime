import { type ComponentProps, useCallback, useEffect, useRef, type FocusEvent } from 'react';
import { cn } from '@/lib/utils';

export function InputArray<AllowEmpty extends boolean = false, ValueType extends 'string' | 'number' = 'string'>({
  className,
  onValueChange,
  allowEmpty,
  value,
  rows = 'auto',
  cols = 1,
  valueType,
  onBlur,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'rows'> & {
  onValueChange: (
    value: (ValueType extends 'number' ? number : string)[] | (AllowEmpty extends true ? undefined : never)
  ) => void;
  placeholder: string;
  value: (ValueType extends 'number' ? number : string)[] | (AllowEmpty extends true ? undefined : never);
  allowEmpty?: AllowEmpty;
  valueType?: ValueType;
  rows?: number | 'auto';
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const updateControl = useCallback(
    (parsed: (ValueType extends 'number' ? number : string)[] | undefined) => {
      if (!ref.current) return;
      ref.current.value = parsed?.join('\n') ?? '';
      if (rows === 'auto') ref.current.rows = (parsed?.length ?? 0) + 1;
    },
    [rows]
  );

  useEffect(() => updateControl(value), [updateControl, value]);

  const handleUpdate = useCallback(() => {
    if (!ref.current) return;
    const parsed = ref.current.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length)
      .map((line) => (valueType === 'number' ? Number(line) : line)) as (ValueType extends 'number'
      ? number
      : string)[];
    onValueChange(
      (allowEmpty && parsed.length === 0 ? undefined : parsed) as
        | (ValueType extends 'number' ? number : string)[]
        | (AllowEmpty extends true ? undefined : never)
    );
    updateControl(parsed);
  }, [allowEmpty, onValueChange, updateControl, valueType]);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLTextAreaElement>) => {
      handleUpdate();
      onBlur?.(event);
    },
    [onBlur, handleUpdate]
  );

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
