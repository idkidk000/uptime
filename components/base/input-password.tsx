import { type ChangeEvent, type ComponentProps, useCallback } from 'react';
import { cn } from '@/lib/utils';

//TODO: show password when focussed
export function InputPassword({
  className,
  onValueChange,
  autoComplete = 'on',
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & {
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.currentTarget.value),
    [onValueChange]
  );

  return (
    <input
      className={cn(
        'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2',
        className
      )}
      onChange={handleChange}
      type='password'
      autoComplete={autoComplete}
      {...props}
    />
  );
}
