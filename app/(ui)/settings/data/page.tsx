/** biome-ignore-all lint/a11y/noLabelWithoutControl: bruh moment */
'use client';

import { Download, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTransferPost } from '@/app/api/data-transfer/schema';
import type { ApiResponse } from '@/app/api/types';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InputFile } from '@/components/input/input-file';
import { Switch } from '@/components/input/switch';
import { Modal, ModalClose, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { useToast } from '@/hooks/toast';
import { toLocalIso } from '@/lib/date';
import { useLogger } from '@/lib/logger/client';
import { ServiceStatus } from '@/lib/types';
import { formatError } from '@/lib/utils';
import { name, version } from '@/package.json';

const jsonSchemaName = `${name}-${version}.schema.json`;

function UploadForm() {
  const [replace, setReplace] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const stateRef = useRef({ replace, files });
  const { showToast } = useToast();
  const { close, modalRef } = useModal();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logger = useLogger(import.meta.url);

  useEffect(() => {
    stateRef.current = { replace, files };
  }, [replace, files]);

  useEffect(() => {
    const controller = new AbortController();
    // biome-ignore format: no
    modalRef.current?.addEventListener('toggle', () => {
      if (inputRef.current) inputRef.current.value = '';
    }, { signal: controller.signal });
    return () => controller.abort();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!stateRef.current.files?.length) return;
    const file = stateRef.current.files[0];
    const text = await file.text();
    const data = JSON.parse(text);
    const response: ApiResponse<null> = await fetch('/api/data-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, replace: stateRef.current.replace } satisfies DataTransferPost),
    })
      .then((response) => response.json())
      .catch((error) => ({ ok: false, error: formatError(error) }));
    if (response.ok) {
      showToast(`Imported ${file.name}`, '', ServiceStatus.Up);
      close();
    } else {
      showToast(`Error importing ${file.name}`, response.error, ServiceStatus.Down);
      logger.error(response.error);
    }
  }, []);

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-[auto_auto] gap-4 items-center'>
        <div className='contents'>
          <label className='contents'>
            File
            <InputFile accept='.json' onValueChange={setFiles} ref={inputRef} />
          </label>
          <span className='col-start-2 -mt-2 text-unknown text-sm'>Settings file to upload</span>
        </div>
        <div className='contents'>
          <label className='contents'>
            <span className='text-down font-semibold'>Replace</span>
            <Switch onValueChange={setReplace} value={replace} />
          </label>
          <span className='col-start-2 -mt-2 text-unknown text-sm'>Replace all current settings and services</span>
        </div>
      </div>
      <div className='flex gap-4 justify-around'>
        <Button disabled={!files?.length} onClick={handleSubmit}>
          Submit
        </Button>
        <ModalClose variant='unknown'>Cancel</ModalClose>
      </div>
    </div>
  );
}

export default function DataSettingsPage() {
  return (
    <Modal>
      <Card className='flex flex-col gap-4'>
        <div className='grid grid-cols-[auto_auto] me-auto gap-4 items-center'>
          <h3 className='col-span-full font-semibold'>Download</h3>
          <div className='contents'>
            <label className='contents'>
              Settings and services
              <Button
                as={'a'}
                href='/api/data-transfer/settings'
                download={`${name}-${version}.settings-${toLocalIso().replaceAll(/[: -]/g, '')}.json`}
                size='md'
                variant='muted'
              >
                <Download />
                Download
              </Button>
            </label>
          </div>
          <div className='contents'>
            <label className='contents'>
              JSON schema
              <Button as='a' href='/api/data-transfer/schema' download={jsonSchemaName} size='md' variant='muted'>
                <Download />
                Download
              </Button>
            </label>
          </div>
          <div className='contents'>
            <label className='contents'>
              History
              <Button
                as='a'
                href='/api/data-transfer/history'
                download={`${name}-${version}.history-${toLocalIso().replaceAll(/[: -]/g, '')}.json`}
                size='md'
                variant='muted'
              >
                <Download />
                Download
              </Button>
            </label>
          </div>
          <h3 className='col-span-full font-semibold'>Upload</h3>
          <div className='contents'>
            <label className='contents'>
              Settings and services
              <ModalTrigger size='md' variant='pending'>
                <Upload />
                Upload
              </ModalTrigger>
            </label>
          </div>
        </div>
      </Card>
      <ModalContent>
        <UploadForm />
      </ModalContent>
    </Modal>
  );
}
