/** biome-ignore-all lint/a11y/noLabelWithoutControl: bruh moment */
'use client';

import { Download, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getData, getHistory, setData } from '@/actions/data-transfer';
import { dataTransferJsonSchema } from '@/actions/data-transfer/schema';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InputFile } from '@/components/input/input-file';
import { Switch } from '@/components/input/switch';
import { Modal, ModalClose, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { useToast } from '@/hooks/toast';
import { toLocalIso } from '@/lib/date';
import { ServiceStatus } from '@/lib/types';
import { name, version } from '@/package.json';

// FIXME: other than using <a/> with a href of some api endpoint, is there a less ridiculous way to do this?
function download(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const jsonSchemaName = `${name}-${version}.schema.json`;

function UploadForm() {
  const [replace, setReplace] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const stateRef = useRef({ replace, files });
  const { showToast } = useToast();
  const { close, modalRef } = useModal();
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    const json = JSON.parse(text);
    setData(json, stateRef.current.replace)
      .then(() => {
        showToast(`Imported ${file.name}`, '', ServiceStatus.Up);
        close();
      })
      .catch((err) => showToast(`Error importing ${file.name}`, String(err), ServiceStatus.Down));
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
  const handleDownloadSettingsClick = useCallback(() => {
    getData().then((data) =>
      download(
        { ...data, $schema: jsonSchemaName },
        `${name}-${version}.settings-${toLocalIso().replaceAll(/[: -]/g, '')}.json`
      )
    );
  }, []);

  const handleDownloadSchemaClick = useCallback(() => {
    download(dataTransferJsonSchema, jsonSchemaName);
  }, []);

  const handleDownloadHistoryClick = useCallback(() => {
    getHistory().then((data) =>
      download(data, `${name}-${version}.history-${toLocalIso().replaceAll(/[: -]/g, '')}.json`)
    );
  }, []);

  return (
    <Modal>
      <Card className='flex flex-col gap-4'>
        <div className='grid grid-cols-[auto_auto] me-auto gap-4 items-center'>
          <h3 className='col-span-full font-semibold'>Download</h3>
          <div className='contents'>
            <label className='contents'>
              Settings and services
              <Button onClick={handleDownloadSettingsClick} size='md'>
                <Download />
                Download
              </Button>
            </label>
          </div>
          <div className='contents'>
            <label className='contents'>
              JSON schema
              <Button onClick={handleDownloadSchemaClick} size='md'>
                <Download />
                Download
              </Button>
            </label>
          </div>
          <div className='contents'>
            <label className='contents'>
              History
              <Button onClick={handleDownloadHistoryClick} size='md'>
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
