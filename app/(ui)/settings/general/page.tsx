/** biome-ignore-all lint/correctness/noChildrenProp: not my library */

'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { updateSettings } from '@/actions/setting';
import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { makeZodValidator, useAppForm } from '@/lib/form';
import { settingsSchema } from '@/lib/settings/schema';
import { ServiceStatus } from '@/lib/types';

export default function GeneralSettingsPage() {
  const logger = useLogger(import.meta.url);
  const { settings } = useAppQueries();
  const { showToast } = useToast();

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
      <form>
        <fieldset>
          <legend>Monitors</legend>
          <form.AppField
            name='monitor.defaultTimeout'
            children={(field) => (
              <field.FormInputDuration label='Timeout' mode='millis' description='Default timeout for monitors' />
            )}
          />
          <form.AppField
            name='monitor.concurrency'
            children={(field) => (
              <field.FormInputNumber
                label='Concurrency'
                withButtons
                description='Number of monitors to check concurrently'
              />
            )}
          />
          <form.AppField
            name='monitor.enable'
            children={(field) => <field.FormSwitch label='Enable' description='Scheduler override' />}
          />
        </fieldset>
        <fieldset>
          <legend>History</legend>
          <form.AppField
            name='history.summaryItems'
            children={(field) => (
              <field.FormInputNumber
                label='Summary items'
                withButtons
                description='Number of ticks to show in bar graph'
              />
            )}
          />
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
