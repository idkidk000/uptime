/** biome-ignore-all lint/correctness/noChildrenProp: not my library */

'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { updateSettings } from '@/actions/setting';
import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useAppForm } from '@/hooks/form';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { ServiceStatus } from '@/lib/drizzle/schema';
import { settingsSchema } from '@/lib/settings/schema';

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
      // no point resetting
      // form.formApi.reset();
    },
    validators: {
      // @ts-expect-error: tanstack form thinks the schema can't handle undefined fields (it can and has defaults for all of them)
      // settingsSchema.required() is not recursive so does not help
      // FIXME: conflict seems to be in settingsSchema['~standard'].types, which is (tuple of shape in, shape out) | undefined. shape in allows undefined. shape out does not. tanstack form should be looking at shape out i think. maybe the type can be asserted. or maybe it would be easier to just write my own form hook idk
      onSubmit: settingsSchema.required(),
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
