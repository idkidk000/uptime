import { ChevronDown } from 'lucide-react';
import { type ComponentProps, type MouseEvent, useCallback } from 'react';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/popover';
import { useLogger } from '@/hooks/logger';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/badge';

/** custom component because firefox does not support styling <select> */
export function Select<
  ValueType extends string | number,
  AllowEmpty extends boolean = false,
  Multi extends boolean = false,
>({
  onValueChange,
  value,
  placeholder,
  mode,
  options,
  variant = 'transparent',
  className,
  children,
  allowEmpty,
  multi,
  alignment = 'center',
  ...props
}: {
  onValueChange: (
    value: (Multi extends true ? ValueType[] : ValueType) | (AllowEmpty extends true ? undefined : never)
  ) => void;
  value: (Multi extends true ? ValueType[] : ValueType) | (AllowEmpty extends true ? undefined : never);
  placeholder: string;
  mode: ValueType extends string ? 'text' : ValueType extends number ? 'number' : never;
  options: { value: ValueType; label: string }[];
  allowEmpty?: AllowEmpty;
  multi?: Multi;
  alignment?: ComponentProps<typeof PopoverContent>['alignment'];
} & Omit<ComponentProps<typeof PopoverTrigger>, 'role' | 'aria-valuenow' | 'value'>) {
  const logger = useLogger(import.meta.url);

  const selected = options.filter(
    (item) => (Array.isArray(value) && value.includes(item.value)) || item.value === value
  );

  logger.debugLow({ multi, allowEmpty }, 'value', value, 'selected', selected);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const clicked = event.currentTarget.dataset.value;
      const typed = (allowEmpty && clicked === 'undefined' ? undefined : mode === 'text' ? clicked : Number(clicked)) as
        | (Multi extends true ? ValueType[] : ValueType)
        | (AllowEmpty extends true ? undefined : never);
      if (multi) {
        const typedValue = (value ?? []) as ValueType[];
        const typedClicked = typed as ValueType;
        const next = typedValue.includes(typedClicked)
          ? typedValue.filter((item) => item !== typedClicked)
          : [...typedValue, typedClicked];
        onValueChange(
          (next.length === 0 && allowEmpty ? undefined : next) as
            | (Multi extends true ? ValueType[] : ValueType)
            | (AllowEmpty extends true ? undefined : never)
        );
      } else onValueChange(typed);
    },
    [mode, onValueChange, allowEmpty, multi, value]
  );

  return (
    <Popover>
      <PopoverTrigger
        role='list'
        aria-valuenow={value as number}
        variant={variant}
        className={cn(selected.length === 0 && 'text-foreground/65', className)}
        {...props}
      >
        {multi && selected.length
          ? selected.map((item) => (
              <Badge key={item.value} size='sm' variant='muted'>
                {item.label}
              </Badge>
            ))
          : selected.length
            ? selected.map((item) => item.label).join(', ')
            : placeholder}
        <ChevronDown className='ms-auto' />
      </PopoverTrigger>
      <PopoverContent
        role='listbox'
        alignment={alignment}
        className={cn(
          'open:flex flex-col gap-2 rounded-t-none border-t-0',
          alignment === 'center' ? 'w-[calc(anchor-size(width)-2em)]' : 'w-[calc(anchor-size(width)-1em)]'
        )}
      >
        {[...(allowEmpty && !multi ? [{ label: '-', value: 'undefined' }] : []), ...options].map(({ label, value }) => (
          <PopoverClose
            key={value}
            data-value={value}
            variant='transparent'
            onClick={handleClick}
            role='listitem'
            className={cn(
              'hover:bg-background py-0',
              selected.find((item) => item.value === value) && 'bg-up border-up text-dark hover:bg-up'
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
