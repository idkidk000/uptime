'use client';

import { Plus, SquarePen } from 'lucide-react';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';
import z from 'zod';
import { addGroup, editGroup } from '@/actions/group';
import { deleteGroup } from '@/actions/group/index';
import { type GroupUpdateWithNotifiers, groupUpdateWithNotifiersSchema } from '@/actions/group/schema';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ConfirmModal, ConfirmModalTrigger } from '@/components/confirm-modal';
import { Modal, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { useAppQueries } from '@/hooks/app-queries';
import { useToast } from '@/hooks/toast';
import { makeZodValidator, useAppForm } from '@/lib/form';
import { useLogger } from '@/lib/logger/client';
import { ServiceStatus } from '@/lib/types';

// preserve id so same logic can be used for add and edit
const schema = groupUpdateWithNotifiersSchema.extend({ id: z.int().min(1).optional() });
type DataType = z.infer<typeof schema>;

function GroupForm({ id }: { id?: number }) {
  const logger = useLogger(import.meta.url, 'GroupForm');
  const { close } = useModal();
  const { showToast } = useToast();
  const { notifiers, groups } = useAppQueries();

  const group = useMemo(() => {
    const item = groups.find((item) => item.id === id);
    if (item) return { ...item, renotifySeconds: item.renotifySeconds ?? undefined };
  }, [id, groups]);

  const form = useAppForm({
    defaultValues: (group ?? { name: '', active: true, notifiers: [], renotifySeconds: undefined }) as DataType,
    onSubmit(form) {
      logger.info('submit', form.value);
      if (typeof id === 'number')
        editGroup(form.value as GroupUpdateWithNotifiers).then((response) => {
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
        addGroup(form.value).then((response) => {
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

  const handleReset = useCallback(() => form.reset(), [form]);

  const handleCancel = useCallback(() => {
    form.reset();
    close();
  }, [form]);

  const handleDelete = useCallback(() => {
    if (typeof id !== 'number') return;
    deleteGroup(id).then((response) => {
      if (response.ok) {
        showToast(`Deleted ${form.state.values.name}`, '', ServiceStatus.Up);
        form.reset();
        close();
      } else {
        showToast(`Error deleting ${form.state.values.name}`, response.error, ServiceStatus.Down);
        logger.error(response.error);
      }
    });
  }, [id, form]);

  return (
    <form>
      <form.AppField name='name'>
        {(field) => <field.FormInputText label='Name' description='Unique name' />}
      </form.AppField>
      <form.AppField name='renotifySeconds'>
        {(field) => (
          <field.FormInputDuration
            label='Renotify'
            description='How often to resend notifications'
            allowEmpty
            mode='seconds'
          />
        )}
      </form.AppField>
      <form.AppField name='notifiers'>
        {(field) => (
          <field.FormSelect
            label='Notifiers'
            description='Notifiers to use'
            multi
            options={notifiers
              .toSorted((a, b) => a.name.localeCompare(b.name))
              .map(({ id, name }) => ({ label: name, value: id }))}
            mode='number'
          />
        )}
      </form.AppField>
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

export default function GroupsSettingsPage() {
  const { groups, notifiers } = useAppQueries();
  const [id, setId] = useState<number | undefined>(undefined);

  const handleAddClick = useCallback(() => setId(undefined), []);

  // biome-ignore format: no
  const handleEditClick = useCallback((event: MouseEvent<HTMLButtonElement>) =>
    setId(Number(event.currentTarget.dataset.id)),
  []);

  const groupsWithNotifiers = useMemo(() => {
    const sortedNotifiers = notifiers.toSorted((a, b) => a.name.localeCompare(b.name));
    return groups
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({ ...group, notifiers: sortedNotifiers.filter((item) => group.notifiers.includes(item.id)) }));
  }, [groups, notifiers]);

  return (
    <Modal>
      <Card className='flex flex-col gap-4'>
        <ModalTrigger className='me-auto' size='lg' onClick={handleAddClick}>
          <Plus />
          Add a new group
        </ModalTrigger>
        <div className='grid gap-4 grid-cols-[max-content_max-content_max-content] items-center'>
          <div className='contents font-semibold'>
            <div>Name</div>
            <div>Notifiers</div>
            <div />
          </div>
          {groupsWithNotifiers.map((group) => (
            <div className='contents' key={group.id}>
              <div>{group.name}</div>
              <div className='flex gap-2'>
                {group.notifiers.map((item) => (
                  <Badge key={item.id} size='sm' variant={item.active ? 'up' : 'muted'}>
                    {item.name}
                  </Badge>
                ))}
              </div>
              <ModalTrigger variant='muted' onClick={handleEditClick} data-id={group.id}>
                <SquarePen />
                Edit
              </ModalTrigger>
            </div>
          ))}
        </div>
      </Card>
      <ModalContent closedBy='none'>
        <GroupForm id={id} />
      </ModalContent>
    </Modal>
  );
}
