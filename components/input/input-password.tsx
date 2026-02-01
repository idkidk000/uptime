import { type ChangeEvent, type ComponentProps, type FocusEvent, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export type PasswordValue<AllowEmpty extends boolean> = AllowEmpty extends true ? string | undefined : string;

export function InputPassword<AllowEmpty extends boolean = false>({
  className,
  onValueChange,
  autoComplete = 'on',
  allowEmpty,
  value,
  onFocus,
  onBlur,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value'> & {
  onValueChange: (value: PasswordValue<AllowEmpty>) => void;
  placeholder: string;
  value: PasswordValue<AllowEmpty>;
  allowEmpty?: AllowEmpty;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  // biome-ignore format: no
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    onValueChange(
      (allowEmpty && value === '' ? undefined : value) as PasswordValue<AllowEmpty>
    );
  }, [onValueChange, allowEmpty]);

  // biome-ignore format: no
  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    if (!ref.current) return;
    ref.current.type = 'text';
    onFocus?.(event);
  }, [onFocus]);

  // biome-ignore format: no
  const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
    if (!ref.current) return;
    ref.current.type = 'password';
    onBlur?.(event);
  }, [onBlur]);

  return (
    <input
      onFocus={handleFocus}
      onBlur={handleBlur}
      ref={ref}
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
