import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { Button } from '@/components/base/button';
import { FormInputDuration } from '@/components/form/input-duration';
import { FormInputNumber } from '@/components/form/input-number';
import { FormInputText } from '@/components/form/input-text';
import { FormSelect } from '@/components/form/select';
import { FormSwitch } from '@/components/form/switch';

// https://tanstack.com/form/latest/docs/framework/react/guides/form-composition

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormInputText,
    FormInputNumber,
    FormSelect,
    FormInputDuration,
    FormSwitch,
  },
  formComponents: {
    Button,
  },
});
