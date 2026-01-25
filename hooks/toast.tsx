'use client';

import { Pin, X } from 'lucide-react';
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/base/button';
import { useSse } from '@/hooks/sse';
import { dateAdd, dateDiff, toLocalIso } from '@/lib/date';
import { ServiceStatus, serviceStatuses } from '@/lib/drizzle/schema';
import { cn } from '@/lib/utils';

const MAX_TOASTS = 3;
const CLOSING_MILLIS = 300;
const CLOSE_MILLIS = 10_000;
const HOLD_MILLIS = CLOSE_MILLIS * 3;

enum ToastState {
  Open,
  Closing,
  Closed,
}

interface ToastData {
  variant?: ServiceStatus;
  message: string;
  title: string;
  closeAt: Date;
  id: string;
  state: ToastState;
  held: boolean;
}

interface Context {
  showToast: (title: string, message: string, variant?: ServiceStatus) => string;
  toasts: ToastData[];
  setToasts: Dispatch<SetStateAction<ToastData[]>>;
}

const Context = createContext<Context | null>(null);

// TODO: animate position change
function Toast({ id, message, title, state, closeAt, held, variant }: ToastData) {
  const { setToasts } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // biome-ignore format: no
  const setClosing = useCallback(() => setToasts((prev) =>
    prev.map((item) => (item.id === id ? { ...item, state: ToastState.Closing } : item))),
  [id]);

  // biome-ignore format: no
  const toggleHeld = useCallback(() => setToasts((prev) =>
    prev.map((item) =>
      item.id === id
        ? item.held
          ? { ...item, state: ToastState.Open, closeAt: dateAdd({ millis: CLOSE_MILLIS }), held: false }
          : { ...item, state: ToastState.Open, closeAt: dateAdd({ millis: HOLD_MILLIS }), held: true }
        : item
    )
  ), [id]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (state === ToastState.Open) timeoutRef.current = setTimeout(setClosing, Math.max(0, dateDiff(closeAt)));
    else if (state === ToastState.Closing)
      timeoutRef.current = setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), CLOSING_MILLIS);
    else timeoutRef.current = null;
  }, [state, closeAt, id, setClosing]);

  return (
    <div
      className={cn(
        'w-96 max-w-dvw p-4 rounded-xl shadow-lg border-2 border-unknown/25 bg-background text-foreground gap-2 pointer-events-auto select-none grid grid-cols-[1fr_auto_auto] transition-in-right',
        // ' starting:opacity-0 starting:-translate-x-1/2 starting:scale-50 opacity-100 translate-x-0 scale-100 transtion-[opacity,translate,scale] duration-200 origin-center'
        state === ToastState.Closing && 'opacity-0 translate-x-1/2 scale-50',
        variant === ServiceStatus.Down && 'bg-down text-light',
        variant === ServiceStatus.Paused && 'bg-paused text-dark',
        variant === ServiceStatus.Pending && 'bg-pending text-dark',
        variant === ServiceStatus.Up && 'bg-up text-dark'
      )}
      role='alertdialog'
    >
      <h3 className='font-semibold'>{title}</h3>
      <Button
        variant={held ? 'up' : 'muted'}
        onClick={toggleHeld}
        className={cn('aspect-square p-1 text-foreground', held && 'text-background')}
      >
        <Pin />
      </Button>
      <Button variant='muted' onClick={setClosing} className='aspect-square p-1 text-foreground'>
        <X />
      </Button>
      <span className='text-sm col-span-3'>{message}</span>
    </div>
  );
}

function Toaster() {
  const { toasts } = useToast();

  return (
    <div className='fixed bottom-0 right-0 max-h-dvh p-8 max-w-dvw pointer-events-none flex gap-4 flex-col'>
      {toasts.slice(-MAX_TOASTS).map((props) => (
        <Toast key={props.id} {...props} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const { subscribe } = useSse();

  const showToast = useCallback((title: string, message: string, variant?: ServiceStatus) => {
    const id = self.crypto.randomUUID();
    const closeAt = dateAdd({ millis: CLOSE_MILLIS });
    setToasts((prev) => [
      ...prev,
      {
        id,
        message: `${message} at ${toLocalIso(new Date(), { endAt: 's' })}`,
        title,
        closeAt,
        state: ToastState.Open,
        held: false,
        variant,
      },
    ]);
    return id;
  }, []);

  // biome-ignore format: no
  useEffect(() =>
    subscribe('toast', (message) => {
      if (message.kind === 'status')
        showToast(
          `${message.name} is ${serviceStatuses[message.status].toLocaleLowerCase()}`,
          message.message,
          message.status
        );
      else if (message.kind === 'message') showToast(message.title, message.message);
      else throw new Error(`Unhandled toast kind ${(message as { kind: string }).kind}`);
  }), [showToast]);

  // biome-ignore format: no
  const value: Context = useMemo(() => ({showToast,setToasts,toasts}), [toasts, showToast]);

  return (
    <Context value={value}>
      {children}
      <Toaster />
    </Context>
  );
}

export function useToast() {
  const context = useContext(Context);
  if (!context) throw new Error('useToast must be used underneath a ToastProvider');
  return context;
}
