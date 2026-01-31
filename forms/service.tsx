/** biome-ignore-all lint/correctness/noChildrenProp: not my library */

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

// zod does not provide a way to get defaults back out of a schema. zod-empty is a very buggy 3p lib. `required()` and `prefault()` both give undefined. nullable int gives -Number.MAX_SAFE_INT. it only works on top level trivial parts of the schema
const insertDefaults = init(serviceInsertSchema);
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
  const monitorFields = useMemo(
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
      <form>
        <fieldset>
          <legend>Service</legend>
          <form.AppField
            name='name'
            children={(field) => <field.FormInputText label='Name' description='Unique name' />}
          />
          <form.AppField
            name='active'
            children={(field) => <field.FormSwitch label='Active' description='Enable monitoring' />}
          />
          <form.AppField
            name='checkSeconds'
            children={(field) => (
              <field.FormInputDuration label='Check frequency' description='How often to monitor service' />
            )}
          />
          <form.AppField
            name='failuresBeforeDown'
            children={(field) => (
              <field.FormInputNumber
                label='Max failures'
                description='Consecutive failures before the service is considered down'
              />
            )}
          />
          <form.AppField
            name='retainCount'
            children={(field) => (
              <field.FormInputNumber label='Retain count' max={999999} description='Number of history items to keep' />
            )}
          />
          <form.AppField
            name='groupId'
            children={(field) => (
              <field.FormSelect
                label='Group'
                mode='number'
                options={groups.map(({ id, name }) => ({ label: name, value: id }))}
                description='Parent group'
              />
            )}
          />
        </fieldset>
        <fieldset>
          <legend>Monitor</legend>
          <form.AppField
            name='params.kind'
            children={(field) => (
              <field.FormSelect
                label='Type'
                mode='text'
                options={monitorKinds.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                visibleFields={monitorFields}
                description='Type of monitor to use'
              />
            )}
          />
          <form.AppField
            name='params.address'
            children={(field) => (
              <field.FormInputText
                label='Address'
                visibleFields={monitorFields}
                allowEmpty
                description='URL, hostname, or IP'
              />
            )}
          />
          <form.AppField
            name='params.port'
            children={(field) => (
              <field.FormInputNumber
                label='Port'
                visibleFields={monitorFields}
                allowEmpty
                description='TCP port number'
              />
            )}
          />
          <form.AppField
            name='params.username'
            children={(field) => (
              <field.FormInputText
                label='Username'
                visibleFields={monitorFields}
                allowEmpty
                description='Username for service'
              />
            )}
          />
          <form.AppField
            name='params.password'
            children={(field) => (
              <field.FormInputPassword
                label='Password'
                visibleFields={monitorFields}
                allowEmpty
                description='Password for service'
              />
            )}
          />
          <form.AppField
            name='params.recordType'
            children={(field) => (
              <field.FormSelect
                label='Record Type'
                mode='text'
                options={dnsRecordTypes.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                visibleFields={monitorFields}
                description='DNS record type'
              />
            )}
          />
          <form.AppField
            name='params.resolver'
            children={(field) => (
              <field.FormInputText
                label='Resolver'
                visibleFields={monitorFields}
                allowEmpty
                description='DNS resolver'
              />
            )}
          />
          <form.AppField
            name='params.topic'
            children={(field) => (
              <field.FormInputText label='Topic' visibleFields={monitorFields} allowEmpty description='MQTT topic' />
            )}
          />
          <form.AppField
            name='params.headers'
            children={(field) => (
              <field.FormInputRecord
                label='HTTP headers'
                visibleFields={monitorFields}
                allowEmpty
                description='Headers in the form: `header-name: header-value`'
              />
            )}
          />
        </fieldset>
        <fieldset>
          <legend>Up when</legend>
          <form.AppField
            name='params.upWhen.days'
            children={(field) => (
              <field.FormInputNumber
                label='Days'
                visibleFields={monitorFields}
                allowEmpty
                description='Min remaining days'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.latency'
            children={(field) => (
              <field.FormInputNumber
                label='Latency'
                visibleFields={monitorFields}
                allowEmpty
                description='Max latency in millis'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.includes'
            children={(field) => (
              <field.FormInputArray
                label='Includes'
                visibleFields={monitorFields}
                allowEmpty
                description='Records required in response, one per line'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.length'
            children={(field) => (
              <field.FormInputNumber
                label='Length'
                visibleFields={monitorFields}
                allowEmpty
                description='Count of DNS records'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.statusCode'
            children={(field) => (
              <field.FormInputNumber
                label='Status code'
                visibleFields={monitorFields}
                allowEmpty
                description='HTTP status code'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.successPercent'
            children={(field) => (
              <field.FormInputNumber
                label='Success percent'
                visibleFields={monitorFields}
                allowEmpty
                description='Min success percent'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.trusted'
            children={(field) => (
              <field.FormSwitch
                label='Trusted'
                visibleFields={monitorFields}
                allowEmpty
                description='Is the certificate expected to be trusted'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.query.kind'
            children={(field) => (
              <field.FormSelect
                label='Query kind'
                options={queryKind.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                mode='text'
                visibleFields={monitorFields}
                allowEmpty
                description='Type of query to run against returned data'
              />
            )}
          />
          <form.AppField
            name='params.upWhen.query.expression'
            children={(field) => (
              <field.FormInputTextArea
                label='Query expression'
                visibleFields={monitorFields}
                allowEmpty
                description={`${lowerToSentenceCase((upWhenQuery?.kind ?? '') as string)} expression`}
              />
            )}
          />
          {/* FIXME: this is boolean for regex and number|boolean|string for other. using z.coerce but the correct control would be better */}
          <form.AppField
            name='params.upWhen.query.expected'
            children={(field) => (
              <field.FormInputText
                label='Query expected'
                visibleFields={monitorFields}
                allowEmpty
                description='Expected query result'
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
