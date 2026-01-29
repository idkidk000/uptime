import { ChevronDown } from 'lucide-react';
import { type ChangeEvent, type ComponentProps, type MouseEvent, useCallback } from 'react';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/base/popover';
import { cn } from '@/lib/utils';

export function Select<T extends string | number>({
  className,
  onValueChange,
  mode,
  options,
  ...props
}: Omit<ComponentProps<'select'>, 'value'> & {
  onValueChange: (value: T) => void;
  placeholder: string;
  value: T;
  mode: T extends string ? 'text' : T extends number ? 'number' : never;
  options: { value: T; label: string }[];
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      onValueChange((mode === 'text' ? value : Number(value)) as T);
    },
    [mode, onValueChange]
  );

  return (
    <select
      className={cn(
        'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2',
        className
      )}
      onChange={handleChange}
      {...props}
    >
      {options.map(({ label, value }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function Select2<T extends string | number>({
  onValueChange,
  value,
  placeholder,
  mode,
  options,
  variant = 'transparent',
  className,
  children,
  ...props
}: {
  onValueChange: (value: T) => void;
  value?: T;
  placeholder: string;
  mode: T extends string ? 'text' : T extends number ? 'number' : never;
  options: { value: T; label: string }[];
} & Omit<ComponentProps<typeof PopoverTrigger>, 'role' | 'aria-valuenow'>) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const value = event.currentTarget.dataset.value;
      onValueChange((mode === 'text' ? value : Number(value)) as T);
    },
    [mode, onValueChange]
  );

  const selectedOption = options.find((item) => item.value === value);

  return (
    <Popover>
      <PopoverTrigger
        role='list'
        aria-valuenow={value as number}
        variant={variant}
        className={cn(typeof selectedOption === 'undefined' && 'text-foreground/65', className)}
        {...props}
      >
        {selectedOption?.label ?? placeholder}
        <ChevronDown className='ms-auto' />
      </PopoverTrigger>
      <PopoverContent
        role='listbox'
        alignment='center'
        className='open:flex flex-col gap-2 rounded-t-none border-t-0 mx-4 w-[calc(anchor-size(width)-2em)]'
      >
        {options.map(({ label, value }) => (
          <PopoverClose
            key={value}
            data-value={value}
            variant='transparent'
            onClick={handleClick}
            role='listitem'
            className={cn(
              'hover:bg-background py-0',
              value === selectedOption?.value && 'bg-up border-up text-dark hover:bg-up'
            )}
          >
            {label}
          </PopoverClose>
        ))}
        {children}
      </PopoverContent>
    </Popover>
  );
}
