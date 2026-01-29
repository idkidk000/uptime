/** biome-ignore-all lint/correctness/noChildrenProp: not my library */

import { useCallback } from 'react';
import z from 'zod';
import { init } from 'zod-empty';
import { Card } from '@/components/base/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useAppForm } from '@/hooks/form';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { serviceInsertSchema } from '@/lib/drizzle/schema';
import { monitorKinds } from '@/lib/monitor/schema';
import { lowerToSentenceCase } from '@/lib/utils';

// https://tanstack.com/form/latest/docs/framework/react/quick-start

// TODO: figure out how to compose forms dynamically. or maybe i need a form per monitor which imports a big chunk of form components for the main service (i.e. not MonitorParams) bits. but then i'd probably lose form state when switching monitors

const schema = serviceInsertSchema.omit({ params: true }).extend({ monitorKind: z.enum(monitorKinds) });
// BUG: can't get defaults back out of monitor schemas
// zod does not provide a way. zod-empty is a 3p lib but it's very buggy. adding `.required()` to a schema to shut tanstack form up (also a bug) makes zod-empty emit undefined for all keys. using it on a drizzle-zod schema with nullable ints with no default gives -MAX_VALUE. it emits undefined for objects which have a prefault({})
const defaultValues = init(schema);

export function ServiceForm() {
  const logger = useLogger(import.meta.url);
  const { groups } = useAppQueries();
  const { showToast } = useToast();

  const form = useAppForm({
    defaultValues,
    onSubmit(form) {
      logger.info('submit', form.value);
      // TODO: addService(form.value, true)
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
        <form.AppField name='name' children={(field) => <field.FormInputText label='Name' />} />
        <form.AppField name='active' children={(field) => <field.FormSwitch label='Active' />} />
        <form.AppField name='checkSeconds' children={(field) => <field.FormInputDuration label='Check frequency' />} />
        <form.AppField
          name='failuresBeforeDown'
          children={(field) => <field.FormInputNumber label='Failures before down' />}
        />
        <form.AppField
          name='retainCount'
          children={(field) => <field.FormInputNumber label='Retain count' max={999999} />}
        />
        <form.AppField
          name='groupId'
          children={(field) => (
            <field.FormSelect
              label='Group'
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
