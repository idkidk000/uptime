/** biome-ignore-all lint/correctness/noChildrenProp: not my library */
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { useCallback } from 'react';
import z from 'zod';
import { init } from 'zod-empty';
import { Button } from '@/components/base/button';
import { Card } from '@/components/base/card';
import { FormInputDuration } from '@/components/form/input-duration';
import { FormInputNumber } from '@/components/form/input-number';
import { FormInputText } from '@/components/form/input-text';
import { FormSelect } from '@/components/form/select';
import { FormSwitch } from '@/components/form/switch';
import { useAppQueries } from '@/hooks/app-queries';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { serviceInsertSchema } from '@/lib/drizzle/schema';
import { monitorKinds } from '@/lib/monitor/schema';
import { lowerToSentenceCase } from '@/lib/utils';

// https://tanstack.com/form/latest/docs/framework/react/quick-start

// TODO: pre-mapped form components https://tanstack.com/form/latest/docs/framework/react/guides/form-composition
// TODO: figure out how to compose forms dynamically. or maybe i need a form per monitor which imports a big chunk of form components for the main service (i.e. not MonitorParams) bits. but then i'd probably lose form state when switching monitors

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
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
  fieldContext,
  formContext,
});

const schema = serviceInsertSchema.omit({ params: true }).extend({ monitorKind: z.enum(monitorKinds) });
// zod does not provide a way to get default values back out of a schema. zod-empty is a 3p lib but it's quite buggy. adding `.required()` to a schema to shut tanstack form up makes zod-empty emit undefined for all keys. using it on a drizzle-zod schema with nullable ints with no default gives -MAX_VALUE.
const defaultValues = init(schema);

export function ServiceForm() {
  const logger = useLogger(import.meta.url);
  const { groups } = useAppQueries();
  const { showToast } = useToast();

  const form = useAppForm({
    defaultValues,
    onSubmit(form) {
      logger.info('submit', form.value);
      //TODO: addService()
      showToast(`Added ${form.value.name}`, 'Monitor will run shortly');
      form.formApi.reset();
    },
    validators: {
      onSubmit: schema.required(),
    },
  });

  const handleReset = useCallback(() => form.reset(), [form]);

  return (
    <Card>
      <form>
        <form.AppField
          name='name'
          children={(field) => (
            <field.FormInputText
              label='Name'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppField
          name='active'
          children={(field) => (
            <field.FormSwitch
              label='Active'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppField
          name='checkSeconds'
          children={(field) => (
            <field.FormInputDuration
              label='Check frequency'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppField
          name='failuresBeforeDown'
          children={(field) => (
            <field.FormInputNumber
              label='Failures before down'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              withButtons
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppField
          name='retainCount'
          children={(field) => (
            <field.FormInputNumber
              label='Retain count'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              max={999999}
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppField
          name='groupId'
          children={(field) => (
            <field.FormSelect
              label='Group'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              errors={field.state.meta.errors}
              mode='number'
              options={groups.map(({ id, name }) => ({ label: name, value: id }))}
            />
          )}
        />
        <form.AppField
          name='monitorKind'
          children={(field) => (
            <field.FormSelect
              label='Type'
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
              value={field.state.value}
              errors={field.state.meta.errors}
              mode='text'
              options={monitorKinds.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
            />
          )}
        />
        <form.AppForm>
          <div className='col-span-full flex gap-8 justify-center'>
            <form.Button type='button' onClick={form.handleSubmit}>
              Submit
            </form.Button>
            <form.Button type='button' onClick={handleReset} variant='down'>
              Reset
            </form.Button>
          </div>
        </form.AppForm>
      </form>
    </Card>
  );
}
