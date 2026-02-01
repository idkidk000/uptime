'use client';

import { useStore } from '@tanstack/react-form';
import { Plus, ShieldQuestion, SquarePen } from 'lucide-react';
import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react';
import z from 'zod';
import { init } from 'zod-empty';
import { addNotifier, checkNotifier, editNotifier } from '@/actions/notifier';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmModal, ConfirmModalTrigger } from '@/components/confirm-modal';
import { Modal, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { useAppQueries } from '@/hooks/app-queries';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { type NotifierSelect, type NotifierUpdate, notifierInsertSchema } from '@/lib/drizzle/zod/schema';
import { getJsonSchemaDiscUnionFields, makeZodValidator, useAppForm } from '@/lib/form';
import { notifierKinds, notifierParamsSchema } from '@/lib/notifier/schema';
import { ServiceStatus } from '@/lib/types';
import { enumEntries, lowerToSentenceCase } from '@/lib/utils';

//FIXME: params.priority: Record<ServiceStatus,number>. Probably needs to be a one-off control

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
        editNotifier(form.value as NotifierUpdate).then(() => {
          showToast(`Updated ${form.value.name}`, '', ServiceStatus.Up);
          form.formApi.reset();
          close();
        });
      else
        addNotifier(form.value).then(() => {
          showToast(`Added ${form.value.name}`, '', ServiceStatus.Up);
          form.formApi.reset();
          close();
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

function NotifierRow({
  id,
  name,
  params: { kind },
  active,
  setId,
  checkResult,
  setCheckResults,
}: NotifierSelect & {
  setId: Dispatch<SetStateAction<number | undefined>>;
  checkResult: boolean | undefined;
  setCheckResults: Dispatch<SetStateAction<Map<number, boolean>>>;
}) {
  const { showToast } = useToast();
  // biome-ignore lint/correctness/useExhaustiveDependencies(setId): state setters are stable
  const handleEdit = useCallback(() => setId(id), [id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(setCheckResults): state setters are stable
  const handleCheck = useCallback(
    () =>
      checkNotifier(id).then((result) => {
        setCheckResults((prev) => new Map(prev.entries()).set(id, result));
        showToast(
          `${name} test ${result ? 'succeeded' : 'failed'}`,
          '',
          result ? ServiceStatus.Up : ServiceStatus.Down
        );
      }),
    [id, name]
  );
  return (
    <div className='contents'>
      <div>{name}</div>
      <div>{kind}</div>
      <div>
        <Badge size='sm' variant={active ? 'up' : 'paused'}>
          {active ? 'Active' : 'Disabled'}
        </Badge>
      </div>
      <ModalTrigger variant='muted' onClick={handleEdit}>
        <SquarePen />
        Edit
      </ModalTrigger>
      <Button
        onClick={handleCheck}
        variant={typeof checkResult === 'undefined' ? 'muted' : checkResult ? 'up' : 'down'}
      >
        <ShieldQuestion />
        Check
      </Button>
    </div>
  );
}

export default function NotifiersSettingsPage() {
  const { notifiers } = useAppQueries();
  const [id, setId] = useState<number | undefined>(undefined);
  const handleAddClick = useCallback(() => setId(undefined), []);
  const [checkResults, setCheckResults] = useState<Map<number, boolean>>(new Map());

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
            .map((notifier) => (
              <NotifierRow
                key={notifier.id}
                {...notifier}
                setId={setId}
                checkResult={checkResults.get(notifier.id)}
                setCheckResults={setCheckResults}
              />
            ))}
        </div>
      </Card>
      <ModalContent closedBy='none'>
        <NotifierForm id={id} />
      </ModalContent>
    </Modal>
  );
}
