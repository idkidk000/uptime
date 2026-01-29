import { type ComponentProps, useId } from 'react';
import { InputNumber } from '@/components/base/input-number';
import { useFieldContext } from '@/hooks/form';

export function FormInputNumber({
  label,
  placeholder,
  description,
  ...props
}: Omit<ComponentProps<typeof InputNumber>, 'placeholder' | 'value' | 'onValueChange' | 'onBlur'> & {
  label: string;
  withButtons?: boolean;
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  const field = useFieldContext<number>();
  const errors = field.state.meta.errors;

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-1 transition-in-up'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <InputNumber
        id={id}
        value={field.state.value}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        placeholder={placeholder ?? label}
        {...props}
      />
      {errors?.length ? (
        <span className='col-span-2 ms-auto text-down transition-in-up'>
          {errors.map((err) => err?.message).join('. ')}
        </span>
      ) : description ? (
        <span className='col-span-2 ms-auto'>{description}</span>
      ) : null}
    </div>
  );
}
