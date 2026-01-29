import { type ComponentProps, useId } from 'react';
import { Switch } from '@/components/base/switch';
import { useFieldContext } from '@/hooks/form';

export function FormSwitch({
  label,
  placeholder,
  description,
  ...props
}: Omit<ComponentProps<typeof Switch>, 'value' | 'onValueChange' | 'onBlur'> & {
  label: string;
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  const field = useFieldContext<boolean>();
  const errors = field.state.meta.errors;

  return (
    <div className='grid grid-cols-subgrid col-span-2 items-center gap-x-4 gap-y-1'>
      <label htmlFor={id} className='font-semibold'>
        {label}
      </label>
      <Switch
        id={id}
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
