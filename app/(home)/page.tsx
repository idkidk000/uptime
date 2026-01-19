/** biome-ignore-all lint/suspicious/noConsole: TODO: frontend logger hook */
'use client';

import { useEffect, useState } from 'react';
import { getMonitors, type MonitorWithHistorySelect } from '@/actions/monitor';
import { MonitorGraph } from '@/components/monitor-graph';
import { toLocalIso } from '@/lib/date';

//TODO: sse hook, react query
//TODO: date formatters
export default function Home() {
  const [monitors, setMonitors] = useState<MonitorWithHistorySelect[]>();

  useEffect(() => {
    const updateMonitors = () => getMonitors().then((data) => setMonitors(data));
    const eventSource = new EventSource('/api/sse');
    eventSource.addEventListener('error', (err) => console.error('sse error', err));
    eventSource.addEventListener('open', (event) => console.debug('sse open', event));
    eventSource.addEventListener('invalidate', (event) => {
      console.debug('sse invalidate', event);
      void updateMonitors();
    });
    eventSource.addEventListener('message', (event) => console.debug('sse message', event));
    updateMonitors();
    return () => eventSource.close();
  }, []);

  return (
    <main>
      <div className='flex flex-wrap gap-4 p-4 w-full items-center justify-center'>
        {monitors?.map((monitor) => (
          <div
            key={monitor.id}
            className='grid grid-cols-[auto_auto] gap-2 p-4 rounded-md shadow border-2 border-gray-500'
          >
            <span className='font-semibold'>ID</span>
            <span className='font-semibold'>{monitor.id}</span>
            <span className='font-semibold'>Name</span>
            <span className='font-semibold'>{monitor.state}</span>
            <span className='font-semibold'>State</span>
            <span className='font-semibold'>{monitor.name}</span>
            <span>Active</span>
            <span>{String(monitor.active)}</span>
            <span>Created</span>
            <span>{toLocalIso(monitor.createdAt, { endAt: 's' })}</span>
            <span>Updated</span>
            <span>{toLocalIso(monitor.updatedAt, { endAt: 's' })}</span>
            <span>Group ID</span>
            <span>{monitor.groupId}</span>
            <span>Params</span>
            <span className='whitespace-pre'>{JSON.stringify(monitor.params, null, 2)}</span>
            <span>Check seconds</span>
            <span>{monitor.checkSeconds}</span>
            <span>Failures before down</span>
            <span>{monitor.failuresBeforeDown}</span>
            <span>Checked</span>
            <span>{toLocalIso(monitor.checkedAt ?? undefined, { endAt: 's' })}</span>
            <span>Failures</span>
            <span>{monitor.successiveFailures}</span>
            <span>Retain count</span>
            <span>{monitor.retainCount}</span>
            <span>Latest result</span>
            <span className='whitespace-pre-wrap'>{JSON.stringify(monitor.history.at(0), null, 2)}</span>
            <MonitorGraph history={monitor.history} className='col-span-2 w-full' />
          </div>
        ))}
      </div>
    </main>
  );
}
