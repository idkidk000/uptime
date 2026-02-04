'use client';

import { Plus, SquarePen } from 'lucide-react';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';
import z from 'zod';
import { addTag, deleteTag, editTag } from '@/actions/tag';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ConfirmModal, ConfirmModalTrigger } from '@/components/confirm-modal';
import { Modal, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { useAppQueries } from '@/hooks/app-queries';
import { useLogger } from '@/hooks/logger';
import { useToast } from '@/hooks/toast';
import { type TagUpdate, tagInsertSchema } from '@/lib/drizzle/zod/schema';
import { makeZodValidator, useAppForm } from '@/lib/form';
import { ServiceStatus } from '@/lib/types';

// TODO: allow selecting services in tag form. probably needs a combobox

// preserve id so same logic can be used for add and edit
const schema = tagInsertSchema.extend({ id: z.int().min(1).optional() });
type DataType = z.infer<typeof schema>;

function TagForm({ id }: { id: number | null }) {
  const logger = useLogger(import.meta.url, 'GroupForm');
  const { close } = useModal();
  const { showToast } = useToast();
  const { tags } = useAppQueries();

  const tag = useMemo(() => tags.find((item) => item.id === id), [id, tags]);

  const form = useAppForm({
    defaultValues: (tag ?? { name: '' }) as DataType,
    onSubmit(form) {
      logger.info('submit', form.value);
      if (typeof id === 'number')
        editTag(form.value as TagUpdate).then((response) => {
          if (response.ok) {
            showToast(`Updated ${form.value.name}`, '', ServiceStatus.Up);
            form.formApi.reset();
            close();
          } else {
            showToast(`Error updating ${form.value.name}`, `${response.error}`, ServiceStatus.Down);
            logger.error(response.error);
          }
        });
      else
        addTag(form.value).then((response) => {
          if (response.ok) {
            showToast(`Added ${form.value.name}`, '', ServiceStatus.Up);
            form.formApi.reset();
            close();
          } else {
            showToast(`Error adding ${form.value.name}`, `${response.error}`, ServiceStatus.Down);
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
    deleteTag(id).then((response) => {
      if (response.ok) {
        showToast(`Deleted ${form.state.values.name}`, '', ServiceStatus.Up);
        form.reset();
        close();
      } else {
        showToast(`Error deleting ${form.state.values.name}`, '', ServiceStatus.Up);
        logger.error(response.error);
      }
    });
  }, [id, form]);

  return (
    <form>
      <form.AppField name='name'>
        {(field) => <field.FormInputText label='Name' description='Unique name' />}
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

export default function TagsSettingsPage() {
  const { tags, services } = useAppQueries();
  const [id, setId] = useState<number | null>(null);

  const tagsWithServices = useMemo(() => {
    const miniServices = services.map(({ id, name, tags }) => ({ id, name, tags }));
    return tags.map((tag) => ({
      ...tag,
      services: miniServices.filter((service) => service.tags.includes(tag.id)).map(({ id, name }) => ({ id, name })),
    }));
  }, [tags, services]);

  const handleAddClick = useCallback(() => setId(null), []);

  // biome-ignore format: no
  const handleEditClick = useCallback((event: MouseEvent<HTMLButtonElement>) =>
    setId(Number(event.currentTarget.dataset.id)),
  []);

  return (
    <Modal>
      <Card className='flex flex-col gap-4'>
        <ModalTrigger className='me-auto' size='lg' onClick={handleAddClick}>
          <Plus />
          Add a new tag
        </ModalTrigger>
        <div className='grid gap-4 grid-cols-[max-content_max-content_max-content] items-center'>
          <div className='contents font-semibold'>
            <div>Name</div>
            <div>Services</div>
            <div />
          </div>
          {tagsWithServices
            .toSorted((a, b) => a.name.localeCompare(b.name))
            .map((tag) => (
              <div key={tag.id} className='contents'>
                <span>{tag.name}</span>
                <Badge size='sm' variant='muted' className='me-auto'>
                  {tag.services.length}
                </Badge>
                <ModalTrigger variant='muted' data-id={tag.id} onClick={handleEditClick}>
                  <SquarePen />
                  Edit
                </ModalTrigger>
              </div>
            ))}
        </div>
      </Card>
      <ModalContent>
        <TagForm id={id} />
      </ModalContent>
    </Modal>
  );
}
