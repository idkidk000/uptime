import { type ComponentProps, useId } from 'react';
import { InputDuration } from '@/components/base/input-duration';

export function FormInputDuration({
  label,
  placeholder,
  description,
  errors,
  ...props
}: Omit<ComponentProps<typeof InputDuration>, 'placeholder'> & {
  label: string;
  withButtons?: boolean;
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
      <InputDuration id={id} {...props} placeholder={placeholder ?? label} />
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
