'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { updateSettings } from '@/actions/setting';
import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { getJsonSchemaFields, makeZodValidator, useAppForm } from '@/lib/form';
import { settingsSchema } from '@/lib/settings/schema';
import { ServiceStatus } from '@/lib/types';

const fieldsMeta = getJsonSchemaFields(settingsSchema.toJSONSchema({ io: 'input', target: 'openapi-3.0' }));

export default function GeneralSettingsPage() {
  const logger = useLogger(import.meta.url);
  const { settings } = useAppQueries();
  const { showToast } = useToast();

  logger.info(fieldsMeta);

  const form = useAppForm({
    defaultValues: settings,
    onSubmit(form) {
      updateSettings(form.value)
        .then(() => {
          logger.success('updated settings', form.value);
          showToast('Settings updated', '', ServiceStatus.Up);
        })
        .catch((err) => {
          logger.error('error updating settings', form.value, err);
          showToast('Error updating settings', String(err), ServiceStatus.Down);
        });
    },
    validators: {
      onSubmit: makeZodValidator(settingsSchema, logger),
    },
  });

  const handleReset = useCallback(() => form.reset(), [form]);

  return (
    <Card>
      <form className='form-lg'>
        <fieldset>
          <legend>Monitors</legend>
          <form.AppField name='monitor.defaultTimeout'>
            {(field) => <field.FormInputDuration mode='millis' fieldsMeta={fieldsMeta} />}
          </form.AppField>
          <form.AppField name='monitor.concurrency'>
            {(field) => <field.FormInputNumber withButtons fieldsMeta={fieldsMeta} />}
          </form.AppField>
          <form.AppField name='monitor.enable'>{(field) => <field.FormSwitch fieldsMeta={fieldsMeta} />}</form.AppField>
        </fieldset>
        <fieldset>
          <legend>History</legend>
          <form.AppField name='history.summaryItems'>
            {(field) => <field.FormInputNumber withButtons fieldsMeta={fieldsMeta} />}
          </form.AppField>
        </fieldset>
        <fieldset>
          <legend>Server sent events</legend>
          <form.AppField name='sse.throttle'>
            {(field) => <field.FormInputDuration fieldsMeta={fieldsMeta} mode='millis' />}
          </form.AppField>
        </fieldset>
        <form.AppForm>
          <div className='col-span-full flex gap-8 justify-center'>
            <form.Button type='button' onClick={form.handleSubmit}>
              Submit
            </form.Button>
            <form.Button type='button' onClick={handleReset} variant='down'>
              Reset
            </form.Button>
            <form.Button as={Link} href='/dashboard' variant='unknown'>
              Cancel
            </form.Button>
          </div>
        </form.AppForm>
      </form>
    </Card>
  );
}
