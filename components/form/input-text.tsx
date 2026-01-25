import { type ComponentProps, useId } from 'react';
import { InputText } from '@/components/base/input-text';

export function FormInputText({
  label,
  placeholder,
  errors,
  description,
  ...props
}: Omit<ComponentProps<typeof InputText>, 'placeholder'> & {
  label: string;
  placeholder?: string;
  description?: string;
  errors?: unknown[];
}) {
  const id = useId();
  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <InputText {...props} placeholder={placeholder ?? label} />
      {errors?.length ? (
        <span className='col-span-2 ms-auto text-down'>{errors.join('. ')}</span>
      ) : description ? (
        <span className='col-span-2 ms-auto'>{description}</span>
      ) : null}
    </div>
  );
}
