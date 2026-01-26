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
  errors?: (undefined | { message: string })[];
}) {
  const id = useId();

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-1'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <InputText id={id} {...props} placeholder={placeholder ?? label} />
      {errors?.length ? (
        <span className='col-span-2 ms-auto text-down transition-in-down'>
          {errors.map((err) => err?.message).join('. ')}
        </span>
      ) : description ? (
        <span className='col-span-2 ms-auto'>{description}</span>
      ) : null}
    </div>
  );
}
