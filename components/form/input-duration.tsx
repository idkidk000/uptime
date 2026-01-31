import { Activity, type ComponentProps, useId } from 'react';
import { InputDuration } from '@/components/input/input-duration';
import { useFieldContext } from '@/lib/form';

export function FormInputDuration<AllowEmpty extends boolean>({
  label,
  placeholder,
  description,
  visibleFields,
  ...props
}: Omit<ComponentProps<typeof InputDuration<AllowEmpty>>, 'placeholder' | 'value' | 'onValueChange' | 'onBlur'> & {
  label: string;
  placeholder?: string;
  description?: string;
  visibleFields?: Set<string>;
}) {
  const id = useId();
  const field = useFieldContext<AllowEmpty extends true ? number | undefined : number>();

  return (
    <Activity mode={visibleFields && !visibleFields.has(field.name) ? 'hidden' : 'visible'}>
      <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-2 transition-in-up'>
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
