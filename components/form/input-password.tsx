import { Activity, type ComponentProps, useId } from 'react';
import { InputPassword, type PasswordValue } from '@/components/input/input-password';
import { type FieldsMeta, useFieldContext } from '@/lib/form';
import { camelToSentenceCase } from '@/lib/utils';

export function FormInputPassword<AllowEmpty extends boolean>({
  label,
  placeholder,
  description,
  fieldsMeta,
  ...props
}: Omit<ComponentProps<typeof InputPassword<AllowEmpty>>, 'placeholder' | 'value' | 'onValueChange' | 'onBlur'> & {
  label?: string;
  placeholder?: string;
  description?: string;
  fieldsMeta?: FieldsMeta;
}) {
  const id = useId();
  const field = useFieldContext<PasswordValue<AllowEmpty>>();
  const fieldMeta = fieldsMeta?.get(field.name);
  const fieldDescription =
    description ??
    (fieldMeta?.description ? `${fieldMeta.description}${fieldMeta.required ? '' : ' (optional)'}` : undefined);
  const fieldLabel = label ?? camelToSentenceCase(field.name.split('.').toReversed()[0]);

  return (
    <Activity mode={fieldsMeta && !fieldsMeta.has(field.name) ? 'hidden' : 'visible'}>
      <div className='grid grid-cols-subgrid col-span-2 items-center gap-y-2 transition-in-up'>
        <label htmlFor={id} className='font-semibold'>
          {fieldLabel}
        </label>
        <InputPassword
          id={id}
          value={field.state.value}
          onValueChange={field.handleChange}
          onBlur={field.handleBlur}
          placeholder={placeholder ?? fieldLabel}
          {...props}
        />
        {!field.state.meta.isValid ? (
          <span className='col-start-2 transition-in-up text-down text-sm' role='alert'>
            {field.state.meta.errors.join('. ')}
          </span>
        ) : fieldDescription ? (
          <span className='col-start-2 transition-in-up text-unknown text-sm'>{fieldDescription}</span>
        ) : null}
      </div>
    </Activity>
  );
}
