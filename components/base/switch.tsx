import { type ComponentProps, type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/base/button';
import { cn } from '@/lib/utils';

export function Switch({
  value,
  onValueChange,
  onClick,
  className,
  variant = 'transparent',
  size = 'icon',
  ...props
}: Omit<ComponentProps<typeof Button<'button'>>, 'value'> & {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const value = !valueRef.current;
      onValueChange(value);
      valueRef.current = value;
      onClick?.(event);
    },
    [onValueChange, onClick]
  );

  return (
    <Button
      onClick={handleClick}
      role='switch'
      aria-checked={value}
      className={cn('w-24 group', className)}
      variant={variant}
      size={size}
      {...props}
    >
      <span className='w-full px-2 bg-foreground/10 rounded-full'>
        <svg
          className='rounded-full size-8 transition-[translate] duration-150 border-2 stroke-dark border-foreground/10 bg-unknown -translate-x-6 group-aria-checked:bg-up group-aria-checked:translate-x-6 mx-auto shadow-md'
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
            className=' origin-center rotate-45 group-aria-checked:scale-x-50 group-aria-checked:-translate-x-[6px] group-aria-checked:translate-y-[2px] transition-[rotate,scale,translate] duration-150'
          />
          <path
            d='M3 12 21 12'
            className=' origin-center -rotate-45 group-aria-checked:translate-x-[3px] group-aria-checked:scale-x-85  transition-[rotate,scale,translate] duration-150'
          />
        </svg>
      </span>
    </Button>
  );
}
