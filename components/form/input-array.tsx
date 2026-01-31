import { Activity, type ComponentProps, useId } from 'react';

import { InputArray } from '@/components/input/input-array';
import { useFieldContext } from '@/lib/form';

export function FormInputArray<AllowEmpty extends boolean, ValueType extends 'string' | 'number'>({
  label,
  placeholder,
  description,
  visibleFields,
  ...props
}: Omit<
  ComponentProps<typeof InputArray<AllowEmpty, ValueType>>,
  'placeholder' | 'value' | 'onValueChange' | 'onBlur'
> & {
  label: string;
  placeholder?: string;
  description?: string;
  visibleFields?: Set<string>;
}) {
  const id = useId();
  const field = useFieldContext<
    (ValueType extends 'number' ? number : string)[] | (AllowEmpty extends true ? undefined : never)
  >();

  return (
    <Activity mode={visibleFields && !visibleFields.has(field.name) ? 'hidden' : 'visible'}>
      <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-2 transition-in-up'>
        <label htmlFor={id} className='font-semibold'>
          {label}
        </label>
        <InputArray
          id={id}
          value={field.state.value}
          onValueChange={field.handleChange}
          onBlur={field.handleBlur}
          placeholder={placeholder ?? label}
          {...props}
        />
        {!field.state.meta.isValid ? (
          <span className='col-start-2 transition-in-up text-down text-sm' role='alert'>
            {field.state.meta.errors.join('. ')}
          </span>
        ) : description ? (
          <span className='col-start-2 transition-in-up text-unknown text-sm'>{description}</span>
        ) : null}
      </div>
    </Activity>
  );
}
