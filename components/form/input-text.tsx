import { type ComponentProps, useId } from 'react';
import { InputText } from '@/components/base/input-text';
import { useFieldContext } from '@/hooks/form';

export function FormInputText({
  label,
  placeholder,
  description,
  ...props
}: Omit<ComponentProps<typeof InputText>, 'placeholder' | 'value' | 'onValueChange' | 'onBlur'> & {
  label: string;
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  const field = useFieldContext<string>();
  const errors = field.state.meta.errors;

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-1'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <InputText
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
