/** biome-ignore-all lint/correctness/noChildrenProp: not my library */

import { useStore } from '@tanstack/react-form';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, useCallback, useMemo } from 'react';
import type z from 'zod';
import { init } from 'zod-empty';
import { addService, editService } from '@/actions/service';
import { Card } from '@/components/base/card';
import { useAppQueries } from '@/hooks/app-queries';
import { useAppForm } from '@/hooks/form';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { ServiceStatus, serviceInsertSchema } from '@/lib/drizzle/schema';
import { dnsRecordTypes } from '@/lib/monitor/dns/schema';
import { queryKind } from '@/lib/monitor/http/schema';
import { type MonitorKind, monitorKinds, monitorParamsSchema } from '@/lib/monitor/schema';
import { lowerToSentenceCase } from '@/lib/utils';

// https://tanstack.com/form/latest/docs/framework/react/quick-start

const schema = serviceInsertSchema.omit({ params: true }).extend({ params: monitorParamsSchema });
// can't get defaults back out of zod monitor schemas
// zod does not provide a way. zod-empty is a very buggy 3p lib. `required()` and `prefault()` both give undefined. nullable int gives -Number.MAX_SAFE_INT. it only works on top level trivial parts of the schema
const insertDefaults = init(schema);

// a vile workaround so i can determine which fields to show. monitorParamsSchema is a z.discriminatedUnion
const monitorParamsJsonSchema = monitorParamsSchema.toJSONSchema({ io: 'input', target: 'openapi-3.0' });
function listMonitorFields(monitorKind: MonitorKind): Set<string> {
  function recurse(fragment: Record<string, unknown>, path: string): undefined | string[] {
    const type = 'type' in fragment ? fragment.type : 'oneOf' in fragment ? 'oneOf' : null;
    if (type === null) return;
    if (type === 'oneOf') {
      if (!Array.isArray(fragment.oneOf)) return;
      return fragment.oneOf
        .flatMap((item) => recurse(item as Record<string, unknown>, path))
        .filter((item) => typeof item !== 'undefined');
    }
    if (type === 'object') {
      if (!('properties' in fragment)) return [path]; //record<string,string>
      return Object.entries(fragment.properties as Record<string, Record<string, unknown>>)
        .flatMap(([key, val]) => recurse(val, `${path}.${key}`))
        .filter((item) => typeof item !== 'undefined');
    }
    return [path];
  }
  const narrowed = (monitorParamsJsonSchema.oneOf as unknown as { properties: { kind: { enum: string[] } } }[]).find(
    (item) => item.properties.kind.enum.includes(monitorKind)
  );
  if (!narrowed) throw new Error(`could not narrow json schema to kind: ${monitorKind}`);
  const set = new Set(recurse(narrowed as Record<string, unknown>, 'params'));
  return set;
}

export function ServiceForm(props: { mode: 'add'; id?: undefined } | { mode: 'edit' | 'clone'; id: number }) {
  const logger = useLogger(import.meta.url);
  const { groups, services } = useAppQueries();
  const { showToast } = useToast();

  // biome-ignore lint/correctness/useExhaustiveDependencies(services.find): using reactive data as form defaults would be very annoying
  const defaultValues = useMemo(() => {
    if (props.mode !== 'add') {
      const item = services.find((item) => item.id === props.id);
      if (!item) throw new Error(`id ${props.id} does not exist`);
      if (props.mode === 'clone') return { ...item, name: '' };
      return item;
    }
    return insertDefaults;
  }, [props]) as z.infer<typeof schema>;

  const form = useAppForm({
    defaultValues,
    onSubmit(form) {
      logger.info('submit', form.value);
      if (props.mode === 'add' || props.mode === 'clone')
        addService(form.value, true)
          .then((id) => {
            showToast(`Added ${form.value.name}`, '', ServiceStatus.Up);
            // form.formApi.reset();
            redirect(`/dashboard/${id}`);
          })
          .catch((err) => {
            logger.error('Error adding service', err);
            showToast('Error adding service', String(err), ServiceStatus.Down);
          });
      if (props.mode === 'edit')
        editService({ ...form.value, id: props.id }, true)
          .then(() => {
            showToast(`Updated ${form.value.name}`, '', ServiceStatus.Up);
            // form.formApi.reset();
            redirect(`/dashboard/${props.id}`);
          })
          .catch((err) => {
            logger.error('Error updating service', err);
            showToast('Error updating service', String(err), ServiceStatus.Down);
          });
    },
    validators: {
      // @ts-expect-error: i think tanstack form is looking at schema['~standard'].type[0] (input shape) rather than output shape
      onSubmit: schema,
    },
  });

  const monitorKind = useStore(form.store, (state) => state.values.params.kind);
  const monitorFields = useMemo(() => listMonitorFields(monitorKind), [monitorKind]);

  const handleReset = useCallback(() => form.reset(), [form]);

  return (
    <Card>
      <form>
        <fieldset>
          <legend>Service</legend>
          <form.AppField name='name' children={(field) => <field.FormInputText label='Name' />} />
          <form.AppField name='active' children={(field) => <field.FormSwitch label='Active' />} />
          <form.AppField
            name='checkSeconds'
            children={(field) => <field.FormInputDuration label='Check frequency' />}
          />
          <form.AppField
            name='failuresBeforeDown'
            children={(field) => <field.FormInputNumber label='Failures before down' />}
          />
          <form.AppField
            name='retainCount'
            children={(field) => <field.FormInputNumber label='Retain count' max={999999} />}
          />
          {/* FIXME: need a way to add groups */}
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
        </fieldset>
        {/* BUG: different schemas can have different default values. could pull defaults out of narrowed json schema and coalesce them into field values on params.kind change */}
        {/* FIXME: need a control to build Record<string,string> for params.headers */}
        {/* FIXME: need a control to build string[] for params.upWhen.includes */}
        <fieldset>
          <legend>Monitor</legend>
          <form.AppField
            name='params.kind'
            children={(field) => (
              <field.FormSelect
                label='Type'
                mode='text'
                options={monitorKinds.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
              />
            )}
          />
          <form.AppField name='params.address' children={(field) => <field.FormInputText label='Address' />} />
          <Activity mode={monitorFields.has('params.port') ? 'visible' : 'hidden'}>
            <form.AppField name='params.port' children={(field) => <field.FormInputNumber label='Port' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.username') ? 'visible' : 'hidden'}>
            <form.AppField name='params.username' children={(field) => <field.FormInputText label='Username' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.password') ? 'visible' : 'hidden'}>
            <form.AppField name='params.password' children={(field) => <field.FormInputPassword label='Password' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.recordType') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.recordType'
              children={(field) => (
                <field.FormSelect
                  label='Record Type'
                  mode='text'
                  options={dnsRecordTypes.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                />
              )}
            />
          </Activity>
          <Activity mode={monitorFields.has('params.resolver') ? 'visible' : 'hidden'}>
            <form.AppField name='params.resolver' children={(field) => <field.FormInputText label='Resolver' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.topic') ? 'visible' : 'hidden'}>
            <form.AppField name='params.topic' children={(field) => <field.FormInputText label='Topic' />} />
          </Activity>
        </fieldset>
        <fieldset>
          <legend>Up when</legend>
          <Activity mode={monitorFields.has('params.upWhen.days') ? 'visible' : 'hidden'}>
            <form.AppField name='params.upWhen.days' children={(field) => <field.FormInputNumber label='Days' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.upWhen.latency') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.upWhen.latency'
              children={(field) => <field.FormInputNumber label='Latency' />}
            />
          </Activity>
          <Activity mode={monitorFields.has('params.upWhen.length') ? 'visible' : 'hidden'}>
            <form.AppField name='params.upWhen.length' children={(field) => <field.FormInputNumber label='Length' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.upWhen.statusCode') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.upWhen.statusCode'
              children={(field) => <field.FormInputNumber label='Status code' />}
            />
          </Activity>
          <Activity mode={monitorFields.has('params.upWhen.successPercent') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.upWhen.successPercent'
              children={(field) => <field.FormInputNumber label='Success percent' />}
            />
          </Activity>
          {/* FIXME: this is a tristate */}
          <Activity mode={monitorFields.has('params.upWhen.trusted') ? 'visible' : 'hidden'}>
            <form.AppField name='params.upWhen.trusted' children={(field) => <field.FormSwitch label='Trusted' />} />
          </Activity>
          <Activity mode={monitorFields.has('params.upWhen.query.kind') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.upWhen.query.kind'
              children={(field) => (
                <field.FormSelect
                  label='Query kind'
                  options={queryKind.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
                  mode='text'
                />
              )}
            />
          </Activity>
          {/* FIXME: textarea? */}
          <Activity mode={monitorFields.has('params.upWhen.query.expression') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.upWhen.query.expression'
              children={(field) => <field.FormInputText label='Query expression' />}
            />
          </Activity>
          {/* FIXME: this is boolean for regex and number|boolean|string for other. using z.coerce but the correct control would be better */}
          <Activity mode={monitorFields.has('params.upWhen.query.expected') ? 'visible' : 'hidden'}>
            <form.AppField
              name='params.upWhen.query.expected'
              children={(field) => <field.FormInputText label='Query expected' />}
            />
          </Activity>
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
              href={props.mode === 'edit' ? `/dashboard/${props.id}` : '/dashboard'}
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
