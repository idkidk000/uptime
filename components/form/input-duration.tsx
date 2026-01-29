import { type ComponentProps, useId } from 'react';
import { InputDuration } from '@/components/base/input-duration';
import { useFieldContext } from '@/hooks/form';

export function FormInputDuration({
  label,
  placeholder,
  description,
  ...props
}: Omit<ComponentProps<typeof InputDuration>, 'placeholder' | 'value' | 'onValueChange' | 'onBlur'> & {
  label: string;
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  const field = useFieldContext<number>();
  const errors = field.state.meta.errors;

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-1'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <InputDuration
        id={id}
        placeholder={placeholder ?? label}
        value={field.state.value}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        {...props}
      />
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
