import { type ComponentProps, useId } from 'react';
import { InputNumber } from '@/components/base/input-number';

export function FormInputNumber({
  label,
  placeholder,
  description,
  errors,
  ...props
}: Omit<ComponentProps<typeof InputNumber>, 'placeholder'> & {
  label: string;
  withButtons?: boolean;
  placeholder?: string;
  description?: string;
  errors?: unknown[];
}) {
  const id = useId();

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-4'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <InputNumber id={id} {...props} placeholder={placeholder ?? label} />
      {errors?.length ? (
        <span className='col-span-2 ms-auto text-down'>{errors.join('. ')}</span>
      ) : description ? (
        <span className='col-span-2 ms-auto'>{description}</span>
      ) : null}
    </div>
  );
}
