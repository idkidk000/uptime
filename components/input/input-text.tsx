import { X } from 'lucide-react';
import { type ChangeEvent, type ComponentProps, useCallback } from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

export type TextValue<AllowEmpty extends boolean> = string | (AllowEmpty extends true ? undefined : never);

export function InputText<AllowEmpty extends boolean = false>({
  className,
  onValueChange,
  type = 'text',
  allowEmpty,
  value,
  withClear,
  ...props
}: Omit<ComponentProps<'input'>, 'value'> & {
  type?: Extract<ComponentProps<'input'>['type'], 'text' | 'search' | 'url' | 'email'>;
  onValueChange: (value: TextValue<AllowEmpty>) => void;
  placeholder: string;
  value: TextValue<AllowEmpty>;
  allowEmpty?: AllowEmpty;
  withClear?: boolean;
}) {
  // biome-ignore format: no
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    onValueChange((allowEmpty && value === '' ? undefined : value) as TextValue<AllowEmpty>);
  }, [onValueChange, allowEmpty]);

  // biome-ignore format: no
  const handleClear = useCallback(() => {
    onValueChange((allowEmpty ? undefined : '') as TextValue<AllowEmpty>);
  } ,[onValueChange, allowEmpty]);

  return (
    <span className='grid items-center'>
      <input
        className={cn(
          'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2 col-start-1 row-start-1',
          withClear && 'pe-10',
          className
        )}
        onChange={handleChange}
        type={type}
        value={value ?? ''}
        {...props}
      />
      {withClear && value && (
        <Button
          className='col-start-1 row-start-1 ms-auto me-2 shadow-none border-0 text-foreground/50 hover:text-foreground'
          variant='ghost'
          size='icon'
          onClick={handleClear}
        >
          <X />
        </Button>
      )}
    </span>
  );
}
