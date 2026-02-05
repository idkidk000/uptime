import { ChevronDown } from 'lucide-react';
import { type ComponentProps, type MouseEvent, useCallback } from 'react';
import { Badge } from '@/components/badge';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/popover';
import { cn } from '@/lib/utils';

type SelectValue<ValueType extends string | number, AllowEmpty extends boolean, Multi extends boolean> =
  | (Multi extends true ? ValueType[] : ValueType)
  | (AllowEmpty extends true ? undefined : never);

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
  variant = 'ghost',
  className,
  children,
  allowEmpty,
  multi,
  contain,
  hideValue,
  ...props
}: {
  onValueChange: (value: SelectValue<ValueType, AllowEmpty, Multi>) => void;
  value: SelectValue<ValueType, AllowEmpty, Multi>;
  placeholder: string;
  mode: ValueType extends string ? 'text' : ValueType extends number ? 'number' : never;
  options: { value: ValueType; label: string }[];
  allowEmpty?: AllowEmpty;
  multi?: Multi;
  contain?: boolean;
  hideValue?: boolean;
} & Omit<ComponentProps<typeof PopoverTrigger>, 'role' | 'aria-valuenow' | 'value'>) {
  const selected = options.filter(
    (item) => (Array.isArray(value) && value.includes(item.value)) || item.value === value
  );

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const clicked = event.currentTarget.dataset.value;
    const typed = (
      allowEmpty && clicked === 'undefined' ? undefined : mode === 'text' ? clicked : Number(clicked)
    ) as SelectValue<ValueType, AllowEmpty, Multi>;
    if (multi) {
      const typedValue = (value ?? []) as ValueType[];
      const typedClicked = typed as ValueType;
      const next = typedValue.includes(typedClicked)
        ? typedValue.filter((item) => item !== typedClicked)
        : [...typedValue, typedClicked];
      onValueChange(
        (next.length === 0 && allowEmpty ? undefined : next) as SelectValue<ValueType, AllowEmpty, Multi>
      );
    } else onValueChange(typed);
  }, [mode, onValueChange, allowEmpty, multi, value]);

  return (
    <Popover>
      <PopoverTrigger
        role='list'
        aria-valuenow={value as number}
        variant={variant}
        className={cn(selected.length === 0 && 'text-foreground/65', className)}
        {...props}
      >
        {hideValue ? (
          placeholder
        ) : multi && selected.length ? (
          selected.length === options.length ? (
            <Badge size='sm' variant='muted'>
              All
            </Badge>
          ) : (
            selected.map((item) => (
              <Badge key={item.value} size='sm' variant='muted'>
                {item.label}
              </Badge>
            ))
          )
        ) : selected.length ? (
          selected.map((item) => item.label).join(', ')
        ) : (
          placeholder
        )}
        <ChevronDown className='ms-auto' />
      </PopoverTrigger>
      <PopoverContent
        role='listbox'
        className={cn(
          'open:flex flex-col gap-2',
          contain && 'rounded-t-none border-t-0 w-[calc(anchor-size(width)-2em)]'
        )}
      >
        {[...(allowEmpty && !multi ? [{ label: '-', value: 'undefined' }] : []), ...options].map(({ label, value }) => (
          <PopoverClose
            key={value}
            data-value={value}
            variant='ghost'
            onClick={handleClick}
            role='listitem'
            className={cn(
              'hover:bg-background py-0 shadow-none border-transparent',
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
