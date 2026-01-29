import { type ComponentProps, useId } from 'react';
import { Select2 } from '@/components/base/select';
import { useFieldContext } from '@/hooks/form';

export function FormSelect<T extends string | number>({
  label,
  placeholder,
  description,
  ...props
}: Omit<ComponentProps<typeof Select2<T>>, 'placeholder' | 'value' | 'onValueChange' | 'onBlur'> & {
  label: string;
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  const field = useFieldContext<T>();
  const errors = field.state.meta.errors;

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-1'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <Select2
        id={id}
        value={field.state.value}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        placeholder={placeholder ?? label}
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
