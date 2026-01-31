import { Activity, type ComponentProps, useId } from 'react';

import { InputRecord } from '@/components/input/input-record';
import { useFieldContext } from '@/lib/form';

export function FormInputRecord<
  AllowEmpty extends boolean,
  KeyType extends 'string' | 'number',
  ValueType extends 'string' | 'number',
>({
  label,
  placeholder,
  description,
  visibleFields,
  ...props
}: Omit<
  ComponentProps<typeof InputRecord<AllowEmpty, KeyType, ValueType>>,
  'placeholder' | 'value' | 'onValueChange' | 'onBlur'
> & {
  label: string;
  placeholder?: string;
  description?: string;
  visibleFields?: Set<string>;
}) {
  const id = useId();
  const field = useFieldContext<
    | Record<KeyType extends 'number' ? number : string, ValueType extends 'number' ? number : string>
    | (AllowEmpty extends true ? undefined : never)
  >();

  return (
    <Activity mode={visibleFields && !visibleFields.has(field.name) ? 'hidden' : 'visible'}>
      <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-2 transition-in-up'>
        <label htmlFor={id} className='font-semibold'>
          {label}
        </label>
        <InputRecord
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
