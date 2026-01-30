import { type ComponentProps, type MouseEvent, type RefObject, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

export function Switch<AllowEmpty extends boolean = false>({
  value,
  onValueChange,
  onClick,
  className,
  variant = 'transparent',
  size = 'icon',
  allowEmpty,
  ...props
}: Omit<ComponentProps<typeof Button<'button'>>, 'value'> & {
  value: AllowEmpty extends true ? boolean | undefined : boolean;
  onValueChange: (value: AllowEmpty extends true ? boolean | undefined : boolean) => void;
  allowEmpty?: AllowEmpty;
}) {
  const valueRef = useRef(value);
  const buttonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    valueRef.current = value;
    (buttonRef as RefObject<HTMLInputElement>).current.indeterminate = typeof value === 'undefined';
  }, [value]);

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const value = (
      !allowEmpty
        ? !valueRef.current
        : typeof valueRef.current === 'undefined'
          ? true
          : valueRef.current === true
            ? false
            : undefined
    ) as AllowEmpty extends true ? boolean | undefined : boolean;
    onValueChange(value);
    valueRef.current = value;
    onClick?.(event);
  }, [onValueChange, onClick, allowEmpty]);

  // requires aria-checked-indeterminate custom variant
  return (
    <Button
      onClick={handleClick}
      role='switch'
      aria-checked={value}
      className={cn('w-24 group', className)}
      variant={variant}
      size={size}
      ref={buttonRef}
      {...props}
    >
      <span className='w-full px-2 bg-foreground/10 rounded-full'>
        <svg
          className='rounded-full size-8 transition-[translate] duration-150 border-2 stroke-dark border-foreground/10 bg-unknown -translate-x-6 group-aria-checked:bg-up group-aria-checked:translate-x-6 group-aria-checked-indeterminate:translate-x-0! mx-auto shadow-md'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          role='graphics-symbol'
        >
          <path
            d='M3 12 21 12'
            className='origin-center rotate-45 group-aria-checked:scale-x-50 group-aria-checked:-translate-x-[6px] group-aria-checked:translate-y-[2px] group-aria-checked-indeterminate:translate-x-0 group-aria-checked-indeterminate:scale-x-80 group-aria-checked-indeterminate:rotate-0 transition-[rotate,scale,translate] duration-150'
          />
          <path
            d='M3 12 21 12'
            className='origin-center -rotate-45 group-aria-checked:translate-x-[3px] group-aria-checked:scale-x-85 group-aria-checked-indeterminate:translate-x-0 group-aria-checked-indeterminate:scale-x-80 group-aria-checked-indeterminate:rotate-0 transition-[rotate,scale,translate] duration-150'
          />
        </svg>
      </span>
    </Button>
  );
}
