/** biome-ignore-all lint/correctness/noChildrenProp: not my library */
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { useCallback } from 'react';
import { updateSettings } from '@/actions/setting';
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
import { ServiceStatus } from '@/lib/drizzle/schema';
import { settingsSchema } from '@/lib/settings/schema';

// https://tanstack.com/form/latest/docs/framework/react/quick-start

// TODO: pre-mapped form components https://tanstack.com/form/latest/docs/framework/react/guides/form-composition

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

export function SettingsForm() {
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
            name='defaultMonitorTimeout'
            children={(field) => (
              <field.FormInputDuration
                label='Timeout'
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                value={field.state.value}
                errors={field.state.meta.errors}
                mode='millis'
              />
            )}
          />
          <form.AppField
            name='monitorConcurrency'
            children={(field) => (
              <field.FormInputNumber
                label='Concurrency'
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                value={field.state.value}
                errors={field.state.meta.errors}
                withButtons
              />
            )}
          />
          <form.AppField
            name='enableMonitors'
            children={(field) => (
              <field.FormSwitch
                label='Enable'
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                value={field.state.value}
                errors={field.state.meta.errors}
              />
            )}
          />
        </fieldset>
        <fieldset>
          <legend>Misc</legend>
          <form.AppField
            name='historySummaryItems'
            children={(field) => (
              <field.FormInputNumber
                label='History summary items'
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                value={field.state.value}
                errors={field.state.meta.errors}
                withButtons
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
          </div>
        </form.AppForm>
      </form>
    </Card>
  );
}
