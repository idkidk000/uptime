import { useStore } from '@tanstack/react-form';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { init } from 'zod-empty';
import { addService, editService } from '@/actions/service';
import { Card } from '@/components/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { type ServiceInsert, serviceInsertSchema } from '@/lib/drizzle/zod/schema';
import { getJsonSchemaDiscUnionFields, makeZodValidator, useAppForm } from '@/lib/form';
import { dnsRecordTypes } from '@/lib/monitor/dns/schema';
import { queryKind } from '@/lib/monitor/http/schema';
import { monitorKinds, monitorParamsSchema } from '@/lib/monitor/schema';
import { ServiceStatus } from '@/lib/types';
import { lowerToSentenceCase } from '@/lib/utils';

// zod does not provide a way to get defaults back out of a schema. zod-empty is a very buggy 3p lib. `required()` and `prefault()` both give undefined. nullable int gives -Number.MAX_SAFE_INT. it mostly only works on top level trivial parts of the schema
const insertDefaults = init(serviceInsertSchema);
insertDefaults.params.upWhen = undefined;
const monitorParamsJsonSchema = monitorParamsSchema.toJSONSchema({ io: 'input', target: 'openapi-3.0' });

export function ServiceForm(props: { mode: 'add'; id?: undefined } | { mode: 'edit' | 'clone'; id: number }) {
  const logger = useLogger(import.meta.url);
  const { groups, services } = useAppQueries();
  const { showToast } = useToast();
  const router = useRouter();
  // calling router.push from useAppForm({onSubmit}) does nothing
  const [navigateTo, setNavigateTo] = useState<string | null>(null);

  useEffect(() => {
    if (navigateTo) router.push(navigateTo);
  }, [navigateTo, router]);

  const defaultValues = useMemo(() => {
    if (props.mode !== 'add') {
      const item = services.find((item) => item.id === props.id);
      if (!item) {
        logger.error('id', props.id, 'does not exist');
        return null;
      }
      if (props.mode === 'clone') return { ...item, name: '' };
      return item;
    }
    return insertDefaults;
  }, [props, services.find]) as ServiceInsert | null;

  if (defaultValues === null) redirect('/dashboard');

  const form = useAppForm({
    defaultValues,
    onSubmit(form) {
      logger.info('submit', form.value);
      if (props.mode === 'add' || props.mode === 'clone')
        addService(form.value, true)
          .then((id) => {
            showToast(`Added ${form.value.name}`, '', ServiceStatus.Up);
            setNavigateTo(`/dashboard/${id}`);
          })
          .catch((err) => {
            logger.error('Error adding service', err);
            showToast('Error adding service', String(err), ServiceStatus.Down);
          });
      if (props.mode === 'edit')
        editService({ ...form.value, id: props.id }, true)
          .then(() => {
            showToast(`Updated ${form.value.name}`, '', ServiceStatus.Up);
            setNavigateTo(`/dashboard/${props.id}`);
          })
          .catch((err) => {
            logger.error('Error updating service', err);
            showToast('Error updating service', String(err), ServiceStatus.Down);
          });
    },
    validators: {
      onSubmit: makeZodValidator(serviceInsertSchema, logger),
    },
  });

  const monitorKind = useStore(form.store, (state) => state.values.params.kind);
  const paramsFieldsMeta = useMemo(
    () => getJsonSchemaDiscUnionFields(monitorParamsJsonSchema, monitorKind),
    [monitorKind]
  );

  // clear upWhen.query when all its fields are undefined (type is Record<string,unknown>|undefined)
  const upWhenQuery = useStore(
    form.store,
    (state) =>
      (state.values.params.upWhen as typeof state.values.params.upWhen & { query?: Record<string, unknown> })?.query
  );
  useEffect(() => {
    if (typeof upWhenQuery === 'undefined') return;
    if (Object.values(upWhenQuery).every((value) => typeof value === 'undefined' || value === ''))
      form.setFieldValue('params.upWhen.query', undefined);
  }, [upWhenQuery, form]);

  const handleReset = useCallback(() => form.reset(), [form]);

  return (
    <Card>
      <form className='form-lg'>
        <fieldset>
          <legend>Service</legend>
          <form.AppField name='name'>
            {(field) => <field.FormInputText label='Name' description='Unique name' />}
          </form.AppField>
          <form.AppField name='active'>
            {(field) => <field.FormSwitch label='Active' description='Enable monitoring' />}
          </form.AppField>
          <form.AppField name='checkSeconds'>
            {(field) => <field.FormInputDuration label='Check frequency' description='How often to monitor service' />}
          </form.AppField>
          <form.AppField name='failuresBeforeDown'>
            {(field) => (
              <field.FormInputNumber
                label='Max failures'
                description='Consecutive failures before the service is considered down'
              />
            )}
          </form.AppField>
          <form.AppField name='successesBeforeUp'>
            {(field) => (
              <field.FormInputNumber
                label='Min successes'
                description='Consecutive successes before the service is considered up'
              />
            )}
          </form.AppField>
          <form.AppField name='retainCount'>
            {(field) => (
              <field.FormInputNumber label='Retain count' max={999999} description='Number of history items to keep' />
            )}
          </form.AppField>
          <form.AppField name='groupId'>
            {(field) => (
              <field.FormSelect
                label='Group'
                mode='number'
                options={groups.map(({ id, name }) => ({ label: name, value: id }))}
                description='Parent group'
              />
            )}
          </form.AppField>
        </fieldset>
        <fieldset>
          <legend>Monitor</legend>
          <form.AppField name='params.kind'>
            {(field) => (
              <field.FormSelect
                mode='text'
                options={monitorKinds.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                fieldsMeta={paramsFieldsMeta}
                description='Type of monitor to use'
              />
            )}
          </form.AppField>
          <form.AppField name='params.address'>
            {(field) => <field.FormInputText fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.port'>
            {(field) => <field.FormInputNumber fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.username'>
            {(field) => <field.FormInputText fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.password'>
            {(field) => <field.FormInputPassword fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.recordType'>
            {(field) => (
              <field.FormSelect
                mode='text'
                options={dnsRecordTypes.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                fieldsMeta={paramsFieldsMeta}
              />
            )}
          </form.AppField>
          <form.AppField name='params.resolver'>
            {(field) => <field.FormInputText fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.topic'>
            {(field) => <field.FormInputText fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.headers'>
            {(field) => <field.FormInputRecord fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
        </fieldset>
        <fieldset>
          <legend>Up when</legend>
          <form.AppField name='params.upWhen.days'>
            {(field) => <field.FormInputNumber fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.latency'>
            {(field) => <field.FormInputNumber fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.includes'>
            {(field) => <field.FormInputArray fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.length'>
            {(field) => <field.FormInputNumber fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.statusCode'>
            {(field) => <field.FormInputNumber fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.successPercent'>
            {(field) => <field.FormInputNumber fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.trusted'>
            {(field) => <field.FormSwitch fieldsMeta={paramsFieldsMeta} allowEmpty />}
          </form.AppField>
          <form.AppField name='params.upWhen.query.kind'>
            {(field) => (
              <field.FormSelect
                options={queryKind.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                mode='text'
                fieldsMeta={paramsFieldsMeta}
                allowEmpty
              />
            )}
          </form.AppField>
          <form.AppField name='params.upWhen.query.expression'>
            {(field) => (
              <field.FormInputTextArea
                fieldsMeta={paramsFieldsMeta}
                allowEmpty
                description={`${lowerToSentenceCase((upWhenQuery?.kind ?? 'Query') as string)} expression`}
              />
            )}
          </form.AppField>
          <form.AppField name='params.upWhen.query.expected'>
            {(field) => <field.FormInputText fieldsMeta={paramsFieldsMeta} allowEmpty />}
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
            <form.Button
              as={Link}
              href={props.mode === 'add' ? '/dashboard' : `/dashboard/${props.id}`}
              variant='unknown'
            >
              Cancel
            </form.Button>
          </div>
        </form.AppForm>
      </form>
    </Card>
  );
}
