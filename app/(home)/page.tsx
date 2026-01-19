/** biome-ignore-all lint/suspicious/noConsole: TODO: frontend logger hook */
'use client';

import { type MouseEvent, useCallback, useEffect, useState } from 'react';
import { checkMonitor, type FrontendMonitor, getMonitors } from '@/actions/monitor';
import { MonitorGraph } from '@/components/monitor-graph';
import { toLocalIso } from '@/lib/date';
import { MonitorState, monitorStates } from '@/lib/db/schema';

const stateClassNames: Record<MonitorState | 'fallback', string> = {
  [MonitorState.Up]: 'bg-green-500',
  [MonitorState.Down]: 'bg-red-500',
  [MonitorState.Pending]: 'bg-orange-500',
  fallback: 'bg-gray-500',
};

//TODO: sse hook, react query
//TODO: break out into components
//TODO: handle groups
export default function Home() {
  const [monitors, setMonitors] = useState<FrontendMonitor[]>();
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeMonitor = monitors?.find((monitor) => monitor.id === activeId);

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

  const handleSidebarClick = useCallback((event: MouseEvent<HTMLSpanElement>) => {
    const id = Number(event.currentTarget.dataset.id);
    setActiveId(id);
  }, []);

  const handleTestButtonClick = useCallback(() => {
    if (activeId === null) return;
    checkMonitor(activeId);
  }, [activeId]);

  return (
    <div className='fixed inset-0 overflow-hidden'>
      <div className='grid grid-cols-[1fr_3fr] gap-4 p-4 overflow-hidden size-full'>
        <div className='rounded-xl bg-foreground/5 size-full'>
          <div className='grid gap-4 overflow-y-auto p-4'>
            {monitors?.map((monitor) => (
              <span
                key={monitor.id}
                className='rounded-xl bg-background grid p-4 gap-2 shadow'
                onClick={handleSidebarClick}
                data-id={monitor.id}
              >
                <div className='flex gap-4 items-center'>
                  <span
                    className={`text-white px-2 py-1 rounded-full font-semibold text-xs shadow ${stateClassNames[activeMonitor?.latest?.state ?? 'fallback']}`}
                  >
                    {`${((monitor.history.filter((item) => item.state === MonitorState.Up).length / monitor.history.length) * 100).toFixed(1)}%`}{' '}
                  </span>
                  <span className='font-semibold'>{monitor.name}</span>
                </div>
                <MonitorGraph history={monitor.history} />
              </span>
            ))}
          </div>
        </div>
        <main className='w-full h-full rounded-xl bg-foreground/5 overflow-y-auto flex flex-col gap-4 *:w-full p-4'>
          {activeMonitor && (
            <>
              <div className='flex gap-4 rounded-xl bg-background p-4 justify-between shadow'>
                <div className='grid grid-cols-[auto_1fr] gap-2 '>
                  <span className='col-span-2 font-semibold text-2xl'>{activeMonitor.name}</span>
                  <span className='font-semibold'>ID</span>
                  <span className='font-semibold'>{activeMonitor.id}</span>
                  <span className='font-semibold'>State</span>
                  <span className='font-semibold'>
                    {activeMonitor.latest ? monitorStates[activeMonitor.latest.state] : 'No data'}
                  </span>
                  <span className='font-semibold'>Last test</span>
                  <span className='font-semibold'>
                    {toLocalIso(activeMonitor.latest?.createdAt, { endAt: 's', showDate: true })}
                  </span>
                </div>
                <div>
                  <button
                    type='button'
                    className={`text-white px-6 py-3 rounded-full font-semibold shadow text-xl ${stateClassNames[activeMonitor.latest?.state ?? 'fallback']}`}
                    onClick={handleTestButtonClick}
                  >
                    Test
                  </button>
                </div>
              </div>
              <MonitorGraph
                history={activeMonitor.history}
                className='rounded-xl bg-background p-4 shadow'
                showLabels
              />
              <div className='grid grid-cols-2 gap-4 rounded-xl bg-background p-4 shadow'>
                <div className='grid grid-cols-[auto_1fr] gap-2 mb-auto'>
                  <span>Active</span>
                  <span>{String(activeMonitor.active)}</span>
                  <span>Created</span>
                  <span>{toLocalIso(activeMonitor.createdAt, { endAt: 's' })}</span>
                  <span>Updated</span>
                  <span>{toLocalIso(activeMonitor.updatedAt, { endAt: 's' })}</span>
                  <span>Group ID</span>
                  <span>{activeMonitor.groupId}</span>
                  <span>Params</span>
                  <span className='whitespace-pre'>{JSON.stringify(activeMonitor.params, null, 2)}</span>
                </div>
                <div className='grid grid-cols-[auto_1fr] gap-2 mb-auto'>
                  <span>Check seconds</span>
                  <span>{activeMonitor.checkSeconds}</span>
                  <span>Failures before down</span>
                  <span>{activeMonitor.failuresBeforeDown}</span>
                  <span>Failures</span>
                  <span>{activeMonitor.successiveFailures}</span>
                  <span>Retain count</span>
                  <span>{activeMonitor.retainCount}</span>
                  <span>Latest result</span>
                  <span className='whitespace-pre-wrap'>{JSON.stringify(activeMonitor.latest, null, 2)}</span>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
