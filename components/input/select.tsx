import { ChevronDown } from 'lucide-react';
import { type ComponentProps, type MouseEvent, useCallback } from 'react';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/popover';
import { cn } from '@/lib/utils';

/** custom component because firefox does not support styling <select> */
export function Select<ValueType extends string | number, AllowEmpty extends boolean = false>({
  onValueChange,
  value,
  placeholder,
  mode,
  options,
  variant = 'transparent',
  className,
  children,
  allowEmpty,
  ...props
}: {
  onValueChange: (value: AllowEmpty extends true ? ValueType | undefined : ValueType) => void;
  value?: AllowEmpty extends true ? ValueType | undefined : ValueType;
  placeholder: string;
  mode: ValueType extends string ? 'text' : ValueType extends number ? 'number' : never;
  options: { value: ValueType; label: string }[];
  allowEmpty?: AllowEmpty;
} & Omit<ComponentProps<typeof PopoverTrigger>, 'role' | 'aria-valuenow'>) {
  // biome-ignorre format: no
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const value = event.currentTarget.dataset.value;
      onValueChange(
        (allowEmpty && value === 'undefined' ? undefined : mode === 'text' ? value : Number(value)) as ValueType
      );
    },
    [mode, onValueChange, allowEmpty]
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
        {[...(allowEmpty ? [{ label: '-', value: 'undefined' }] : []), ...options].map(({ label, value }) => (
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
