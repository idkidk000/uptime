import { type ChangeEvent, type ComponentProps, useCallback } from 'react';
import { cn } from '@/lib/utils';

export function InputFile({
  className,
  onValueChange,
  ...props
}: Omit<ComponentProps<'input'>, 'value'> & {
  onValueChange: (value: FileList | null) => void;
}) {
  // biome-ignore format: no
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onValueChange(event.currentTarget.files);
  }, [onValueChange]);

  return (
    <span className='grid items-center'>
      <input
        className={cn(
          'rounded-full shadow-md transition-colors border-2 font-semibold border-foreground/10 bg-background-card hover:bg-background-card/75 active:bg-background-card/50 disabled:bg-background-card/25 disabled:text-foreground/75 ring-transparent outline-0 focus-visible:border-up duration-150 px-4 py-2 col-start-1 row-start-1',
          className
        )}
        onChange={handleChange}
        type='file'
        {...props}
      />
    </span>
  );
}
