import { Trash } from 'lucide-react';
import type { ReactElement } from 'react';
import { Modal, ModalClose, ModalContent, ModalTrigger } from '@/components/modal';

export function ConfirmModal({
  message,
  onConfirm,
  children,
}: {
  message: string;
  onConfirm: () => void;
  children: ReactElement;
}) {
  return (
    <Modal>
      {children}
      <ModalContent className='flex flex-col gap-4'>
        <h3 className='text-lg font-semibold'>{message}</h3>
        <div className='flex justify-around'>
          <ModalClose variant='down' onClick={onConfirm}>
            <Trash />
            Yes
          </ModalClose>
          <ModalClose variant='muted'>Cancel</ModalClose>
        </div>
      </ModalContent>
    </Modal>
  );
}

export const ConfirmModalTrigger = ModalTrigger;
