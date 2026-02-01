import { type ChangeEvent, type ComponentProps, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type TextAreaValue<AllowEmpty extends boolean> = string | (AllowEmpty extends true ? undefined : never);

export function InputTextArea<AllowEmpty extends boolean = false>({
  className,
  onValueChange,
  allowEmpty,
  value,
  rows = 1,
  cols = 1,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value'> & {
  onValueChange: (value: TextAreaValue<AllowEmpty>) => void;
  placeholder: string;
  value: TextAreaValue<AllowEmpty>;
  allowEmpty?: AllowEmpty;
}) {
  // biome-ignore format: no
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;
    onValueChange(
      (allowEmpty && value === '' ? undefined : value) as TextAreaValue<AllowEmpty>
    );
  }, [onValueChange, allowEmpty]);

  return (
    <textarea
      className={cn(
        'rounded-4xl shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2',
        className
      )}
      onChange={handleChange}
      value={value ?? ''}
      rows={rows}
      cols={cols}
      {...props}
    />
  );
}
