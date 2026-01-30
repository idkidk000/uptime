import { type ChangeEvent, type ComponentProps, useCallback } from 'react';
import { cn } from '@/lib/utils';

//TODO: show password when focussed
export function InputPassword<AllowEmpty extends boolean = false>({
  className,
  onValueChange,
  autoComplete = 'on',
  allowEmpty,
  value,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value'> & {
  onValueChange: (value: AllowEmpty extends true ? string | undefined : string) => void;
  placeholder: string;
  value: AllowEmpty extends true ? string | undefined : string;
  allowEmpty?: AllowEmpty;
}) {
  // biome-ignore format: no
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    onValueChange(
      (allowEmpty && value === '' ? undefined : value) as AllowEmpty extends true ? string | undefined : string
    );
  }, [onValueChange, allowEmpty]);

  return (
    <input
      className={cn(
        'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2',
        className
      )}
      onChange={handleChange}
      type='password'
      autoComplete={autoComplete}
      value={value ?? ''}
      {...props}
    />
  );
}
