'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { updateSettings } from '@/actions/setting';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useToast } from '@/hooks/toast';
import { getJsonSchemaFields, makeZodValidator, useAppForm } from '@/lib/form';
import { logLevelNames } from '@/lib/logger';
import { useLogger } from '@/lib/logger/client';
import { defaultSettings, settingsSchema } from '@/lib/settings/schema';
import { ServiceStatus } from '@/lib/types';

const fieldsMeta = getJsonSchemaFields(settingsSchema.toJSONSchema({ io: 'input', target: 'openapi-3.0' }));

export default function GeneralSettingsPage() {
  const logger = useLogger(import.meta.url);
  const { settings } = useAppQueries();
  const { showToast } = useToast();
  const form = useAppForm({
    defaultValues: settings,
    onSubmit(form) {
      updateSettings(form.value).then((response) => {
        if (response.ok) {
          logger.success('updated settings', form.value);
          showToast('Settings updated', '', ServiceStatus.Up);
        } else {
          logger.error('error updating settings', form.value, response.error);
          showToast('Error updating settings', response.error, ServiceStatus.Down);
        }
      });
    },
    validators: {
      onSubmit: makeZodValidator(settingsSchema, logger),
    },
  });

  const handleReset = useCallback(() => form.reset(defaultSettings), [form]);

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
        <fieldset>
          <legend>Logging</legend>
          <form.AppField name='logging.rootLevel'>
            {(field) => (
              <field.FormSelect
                fieldsMeta={fieldsMeta}
                mode='text'
                options={logLevelNames.map((name) => ({ label: name, value: name }))}
              />
            )}
          </form.AppField>
          <form.AppField name='logging.overrides' mode='array'>
            {(field) => (
              <Button onClick={() => field.pushValue({ name: '', level: 'Info' })} className='me-auto'>
                Add an override
              </Button>
            )}
          </form.AppField>
        </fieldset>
        <form.AppField name='logging.overrides' mode='array'>
          {(field) =>
            field.state.value.map((_, i) => (
              <fieldset
                // biome-ignore lint/suspicious/noArrayIndexKey: be less annoying
                key={i}
                className='grid col-span-full grid-cols-[auto_3fr_auto] @2xl:grid-cols-[auto_2fr_auto_2fr_auto] @7xl:grid-cols-[auto_2fr_auto_2fr_auto_2fr_auto] gap-4 items-start'
              >
                <form.AppField name={`logging.overrides[${i}].name`}>
                  {(subfield) => <subfield.FormInputText description='Name prefix to match' />}
                </form.AppField>
                <form.AppField name={`logging.overrides[${i}].level`}>
                  {(subfield) => (
                    <subfield.FormSelect
                      mode='text'
                      options={logLevelNames.map((name) => ({ label: name, value: name }))}
                      description='Level to apply to matched loggers'
                    />
                  )}
                </form.AppField>
                <Button onClick={() => field.removeValue(i)} variant='down' className='mx-auto'>
                  Delete
                </Button>
              </fieldset>
            ))
          }
        </form.AppField>
        <fieldset>
          <legend>Database</legend>
          <form.AppField name='database.maintenanceFrequency'>
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
