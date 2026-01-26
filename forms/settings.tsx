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
import { settingsSchema } from '@/lib/settings/schema';

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

export function SettingsForm() {
  const logger = useLogger(import.meta.url);
  const { settings } = useAppQueries();

  const form = useAppForm({
    defaultValues: settings,
    onSubmit(form) {
      updateSettings(form.value)
        .then(() => logger.success('updated settings', form.value))
        .catch((err) => logger.error('error updating settings', form.value, err));
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
      <form className='grid grid-cols-[1fr_2fr] @2xl:grid-cols-[1fr_2fr_1fr_2fr] @8xl:grid-cols-[1fr_2fr_1fr_2fr_1fr_2fr] gap-4 items-center'>
        <fieldset className='grid col-span-full grid-cols-subgrid gap-4 items-center'>
          <legend className='col-span-full font-semibold text-xl mb-4'>Monitors</legend>
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
            name='disableMonitors'
            children={(field) => (
              <field.FormSwitch
                label='Disable'
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                value={field.state.value}
                errors={field.state.meta.errors}
              />
            )}
          />
        </fieldset>
        <fieldset className='grid col-span-full grid-cols-subgrid gap-4 items-center'>
          <legend className='col-span-full font-semibold text-xl mb-4'>Misc</legend>
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
