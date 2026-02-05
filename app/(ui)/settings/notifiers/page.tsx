'use client';

import { useStore } from '@tanstack/react-form';
import { Plus, ShieldQuestion, SquarePen } from 'lucide-react';
import { Activity, type MouseEvent, useCallback, useMemo, useState } from 'react';
import z from 'zod';
import { init } from 'zod-empty';
import { addNotifier, checkNotifier, editNotifier } from '@/actions/notifier';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmModal, ConfirmModalTrigger } from '@/components/confirm-modal';
import { Modal, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { useAppQueries } from '@/hooks/app-queries';
import { useToast } from '@/hooks/toast';
import { type NotifierUpdate, notifierInsertSchema } from '@/lib/drizzle/zod/schema';
import { getJsonSchemaDiscUnionFields, makeZodValidator, useAppForm } from '@/lib/form';
import { useLogger } from '@/lib/logger/client';
import { notifierKinds, notifierParamsSchema } from '@/lib/notifier/schema';
import { ServiceStatus } from '@/lib/types';
import { enumEntries, lowerToSentenceCase } from '@/lib/utils';

const schema = notifierInsertSchema.extend({ id: z.int().min(1).optional() });
type DataType = z.infer<typeof schema>;
// `init` returns the first kind on the service schema but not here
const insertDefaults: Omit<DataType, 'params'> & { params: Partial<DataType['params']> } = {
  ...init(notifierInsertSchema),
  params: { kind: notifierKinds[0] },
};
const notifierParamsJsonSchema = notifierParamsSchema.toJSONSchema({ io: 'input', target: 'openapi-3.0' });

function NotifierForm({ id }: { id: number | undefined }) {
  const logger = useLogger(import.meta.url);
  const { notifiers } = useAppQueries();
  const { showToast } = useToast();
  const { close } = useModal();

  const defaultValues = useMemo(
    () => notifiers.find((item) => item.id === id) ?? insertDefaults,
    [id, notifiers]
  ) as DataType;

  const form = useAppForm({
    defaultValues,
    onSubmit(form) {
      logger.info('submit', form.value);
      if (typeof id === 'number')
        editNotifier(form.value as NotifierUpdate).then((response) => {
          if (response.ok) {
            showToast(`Updated ${form.value.name}`, '', ServiceStatus.Up);
            form.formApi.reset();
            close();
          } else {
            showToast(`Error updating ${form.value.name}`, response.error, ServiceStatus.Down);
            logger.error(response.error);
          }
        });
      else
        addNotifier(form.value).then((response) => {
          if (response.ok) {
            showToast(`Added ${form.value.name}`, '', ServiceStatus.Up);
            form.formApi.reset();
            close();
          } else {
            showToast(`Error adding ${form.value.name}`, response.error, ServiceStatus.Down);
            logger.error(response.error);
          }
        });
    },
    validators: {
      onSubmit: makeZodValidator(schema, logger),
    },
  });

  const notifierKind = useStore(form.store, (state) => state.values.params.kind);
  const notifierFields = useMemo(
    () => getJsonSchemaDiscUnionFields(notifierParamsJsonSchema, notifierKind),
    [notifierKind]
  );

  const handleReset = useCallback(() => form.reset(), [form]);

  const handleCancel = useCallback(() => {
    form.reset();
    close();
  }, [form]);

  const handleDelete = useCallback(() => {
    logger.info('delete', form.state.values.name);
  }, [form]);

  return (
    <form>
      <fieldset>
        <legend>Notifier</legend>
        <form.AppField name='name'>
          {(field) => <field.FormInputText label='Name' description='Unique name' />}
        </form.AppField>
        <form.AppField name='active'>
          {(field) => <field.FormSwitch label='Active' description='Enable notifier' />}
        </form.AppField>
      </fieldset>
      <fieldset>
        <legend>Settings</legend>
        <form.AppField name='params.kind'>
          {(field) => (
            <field.FormSelect
              mode='text'
              options={notifierKinds.map((value) => ({ value, label: lowerToSentenceCase(value) }))}
              fieldsMeta={notifierFields}
              description='Type of monitor to use'
            />
          )}
        </form.AppField>
        <form.AppField name='params.address'>
          {(field) => <field.FormInputText fieldsMeta={notifierFields} allowEmpty />}
        </form.AppField>
        <form.AppField name='params.token'>
          {(field) => <field.FormInputPassword fieldsMeta={notifierFields} allowEmpty />}
        </form.AppField>
        <form.AppField name='params.statuses'>
          {(field) => (
            <field.FormSelect
              fieldsMeta={notifierFields}
              multi
              mode='number'
              options={enumEntries(ServiceStatus).map(([label, value]) => ({ label, value }))}
            />
          )}
        </form.AppField>
        <form.AppField name='params.headers'>
          {(field) => (
            <field.FormInputRecord fieldsMeta={notifierFields} keyType='string' valueType='string' allowEmpty />
          )}
        </form.AppField>
      </fieldset>
      <Activity mode={notifierFields.has('params.priority') ? 'visible' : 'hidden'}>
        <fieldset>
          <legend>Priorities</legend>
          {enumEntries(ServiceStatus).map(([name, value]) => (
            <form.AppField name={`params.priority.${value}`} key={value}>
              {(field) => <field.FormInputNumber label={name} placeholder='Priority' allowEmpty />}
            </form.AppField>
          ))}
        </fieldset>
      </Activity>
      <form.AppForm>
        <div className='col-span-full flex gap-8 justify-center'>
          <form.Button type='button' onClick={form.handleSubmit}>
            Submit
          </form.Button>
          <form.Button type='button' onClick={handleReset} variant='down'>
            Reset
          </form.Button>
          <form.Button type='button' onClick={handleCancel} variant='unknown'>
            Cancel
          </form.Button>
          {typeof id === 'number' && (
            <ConfirmModal
              message={`Are you sure you want to delete ${form.state.values.name}?`}
              onConfirm={handleDelete}
            >
              <ConfirmModalTrigger type='button' variant='down' className='ms-auto'>
                Delete
              </ConfirmModalTrigger>
            </ConfirmModal>
          )}
        </div>
      </form.AppForm>
    </form>
  );
}

export default function NotifiersSettingsPage() {
  const { notifiers } = useAppQueries();
  const [id, setId] = useState<number | undefined>(undefined);
  const [checkResults, setCheckResults] = useState<Map<number, boolean>>(new Map());
  const { showToast } = useToast();

  const handleAddClick = useCallback(() => setId(undefined), []);

  // biome-ignore format: no
  const handleEditClick = useCallback((event: MouseEvent<HTMLButtonElement>) =>
    setId(Number(event.currentTarget.dataset.id)),
  []);

  const handleCheckClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const id = Number(event.currentTarget.dataset.id);
    const name = event.currentTarget.dataset.name;
    checkNotifier(id).then((response) => {
      if (response.ok) {
        setCheckResults((prev) => new Map(prev.entries()).set(id, true));
        showToast(`${name} test succeeded`, '', ServiceStatus.Up);
      } else {
        setCheckResults((prev) => new Map(prev.entries()).set(id, false));
        showToast(`${name} test failed`, response.error, ServiceStatus.Down);
      }
    });
  }, []);

  return (
    <Modal>
      <Card className='flex flex-col gap-4'>
        <ModalTrigger className='me-auto' size='lg' onClick={handleAddClick}>
          <Plus />
          Add a new notifier
        </ModalTrigger>
        <div className='grid gap-4 grid-cols-[max-content_max-content_max-content_max-content_max-content] items-center'>
          <div className='contents font-semibold'>
            <div>Name</div>
            <div>Kind</div>
            <div>Active</div>
            <div />
            <div />
          </div>
          {notifiers
            .toSorted((a, b) => a.name.localeCompare(b.name))
            .map((notifier) => {
              const checkResult = checkResults.get(notifier.id);
              return (
                <div className='contents' key={notifier.id}>
                  <div>{notifier.name}</div>
                  <div>{notifier.params.kind}</div>
                  <div>
                    <Badge size='sm' variant={notifier.active ? 'up' : 'paused'}>
                      {notifier.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <ModalTrigger variant='muted' onClick={handleEditClick} data-id={notifier.id}>
                    <SquarePen />
                    Edit
                  </ModalTrigger>
                  <Button
                    data-id={notifier.id}
                    data-name={notifier.name}
                    onClick={handleCheckClick}
                    variant={typeof checkResult === 'undefined' ? 'muted' : checkResult ? 'up' : 'down'}
                  >
                    <ShieldQuestion />
                    Check
                  </Button>
                </div>
              );
            })}
        </div>
      </Card>
      <ModalContent closedBy='none'>
        <NotifierForm id={id} />
      </ModalContent>
    </Modal>
  );
}
