import { Minus, Plus } from 'lucide-react';
import { type ChangeEvent, type ComponentProps, useCallback, useEffect, useRef } from 'react';
import { Button, ButtonGroup } from '@/components/base/button';
import { cn } from '@/lib/utils';

export function InputNumber({
  className,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  value,
  withButtons,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & {
  onValueChange: (value: number) => void;
  placeholder: string;
  value: number;
  withButtons?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.currentTarget.valueAsNumber),
    [onValueChange]
  );

  const handleMinusClick = useCallback(() => {
    if (valueRef.current > min) onValueChange(Math.max(min, valueRef.current - step));
  }, [min, onValueChange, step]);

  const handlePlusClick = useCallback(() => {
    if (valueRef.current < max) onValueChange(Math.min(max, valueRef.current + step));
  }, [max, onValueChange, step]);

  const merged = cn(
    'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-200 px-4 py-2 flex-grow',
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
          value={value}
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
      value={value}
      {...props}
    />
  );
}
