/** biome-ignore-all lint/correctness/noChildrenProp: i'm copying the examples sweetie */
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { Button } from '@/components/base/button';
import { Card } from '@/components/base/card';
import { FormInputNumber } from '@/components/form/input-number';
import { FormInputText } from '@/components/form/input-text';
import { useLogger } from '@/hooks/logger';
import { serviceInsertSchema } from '@/lib/drizzle/schema';

// https://tanstack.com/form/latest/docs/framework/react/quick-start

// TODO: select component (group, time period). retention should maybe be displayed here as a time period though i'll leave the db unchanged
// TODO: refactor all monitor params as schemas. each will need a form. i think tanstack lets you compose a single form from multiple

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldComponents: {
    FormInputText,
    FormInputNumber,
  },
  formComponents: {
    Button,
  },
  fieldContext,
  formContext,
});

export function ServiceForm() {
  const logger = useLogger(import.meta.url);
  const form = useAppForm({
    defaultValues: {
      name: '',
      active: true,
      checkSeconds: 60,
      failuresBeforeDown: 2,
      retainCount: 10800,
    },
    onSubmit({ value }) {
      logger.info('submit', value);
    },
    validators: {
      onChange: serviceInsertSchema.required({
        active: true,
        checkSeconds: true,
        failuresBeforeDown: true,
        name: true,
        retainCount: true,
      }),
    },
  });
  return (
    <Card>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit().then(() => form.reset());
        }}
        onReset={(event) => {
          event.preventDefault();
          form.reset();
        }}
        className='grid grid-cols-[1fr_2fr] lg:grid-cols-[1fr_2fr_1fr_2fr] gap-4 items-center'
      >
        <form.AppField
          name='name'
          children={(field) => (
            <field.FormInputText
              label='Name'
              onValueChange={field.handleChange}
              value={field.state.value}
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppField
          name='checkSeconds'
          children={(field) => (
            <field.FormInputNumber
              label='Check seconds'
              onValueChange={field.handleChange}
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
              value={field.state.value}
              max={999999}
              errors={field.state.meta.errors}
            />
          )}
        />
        <form.AppForm>
          <div className='col-span-full flex gap-8 justify-center'>
            <form.Button type='submit'>Submit</form.Button>
            <form.Button type='reset' variant='down'>
              Reset
            </form.Button>
          </div>
        </form.AppForm>
      </form>
    </Card>
  );
}
