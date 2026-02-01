import { Minus, Plus } from 'lucide-react';
import { type ChangeEvent, type ComponentProps, useCallback, useEffect, useRef } from 'react';
import { Button, ButtonGroup } from '@/components/button';
import { cn } from '@/lib/utils';

export type NumberValue<AllowEmpty extends boolean> = number | (AllowEmpty extends true ? undefined : never);

export function InputNumber<AllowEmpty extends boolean = false>({
  className,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  value,
  withButtons,
  allowEmpty,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value'> & {
  onValueChange: (value: NumberValue<AllowEmpty>) => void;
  placeholder: string;
  value: NumberValue<AllowEmpty>;
  withButtons?: boolean;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: AllowEmpty;
}) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // biome-ignore format: no
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    onValueChange(
      (allowEmpty && value === '' ? undefined : Number(value)) as NumberValue<AllowEmpty>
    );
  }, [onValueChange, allowEmpty]);

  const handleMinusClick = useCallback(() => {
    if (typeof valueRef.current === 'undefined') onValueChange(max);
    else if ((valueRef.current as number) > min) onValueChange(Math.max(min, (valueRef.current as number) - step));
  }, [max, min, onValueChange, step]);

  const handlePlusClick = useCallback(() => {
    if (typeof valueRef.current === 'undefined') onValueChange(min);
    else if ((valueRef.current as number) < max) onValueChange(Math.min(max, (valueRef.current as number) + step));
  }, [max, min, onValueChange, step]);

  const merged = cn(
    'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2 flex-grow',
    className
  );

  if (withButtons)
    return (
      <ButtonGroup className='flex items-center'>
        <Button size='icon' onClick={handleMinusClick} aria-description='Decrement'>
          <Minus />
        </Button>
        <input
          className={merged}
          onChange={handleChange}
          type='number'
          min={min}
          max={max}
          step={step}
          value={value ?? ''}
          {...props}
        />
        <Button size='icon' onClick={handlePlusClick} aria-description='Increment'>
          <Plus />
        </Button>
      </ButtonGroup>
    );

  return (
    <input
      className={merged}
      onChange={handleChange}
      type='number'
      min={min}
      max={max}
      step={step}
      value={value ?? ''}
      {...props}
    />
  );
}
