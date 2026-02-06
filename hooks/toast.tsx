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
import { Button } from '@/components/button';
import { useSse } from '@/hooks/sse';
import { toLocalIso } from '@/lib/date';
import { ServiceStatus, serviceStatuses } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_TOASTS = 3;
const CLOSING_MILLIS = 300;
const CLOSE_MILLIS = 10_000;
const HOLD_MILLIS = CLOSE_MILLIS * 3;

enum ToastState {
  Open,
  Closing,
}

interface ToastData {
  variant?: ServiceStatus;
  message: string;
  title: string;
  closeAt: number;
  id: number;
  state: ToastState;
  held: boolean;
}

interface Context {
  showToast: (title: string, message: string, variant?: ServiceStatus) => void;
  toasts: ToastData[];
  setToasts: Dispatch<SetStateAction<ToastData[]>>;
}

const Context = createContext<Context | null>(null);

// TODO: animate position change
function Toast({ id, message, title, state, held, variant }: ToastData) {
  const { setToasts } = useToast();

  // biome-ignore format: no
  const handleCloseClick = useCallback(() => setToasts((prev) =>
    prev.map((item) => (item.id === id ? { ...item, state: ToastState.Closing } : item))),
  [id]);

  // biome-ignore format: no
  const handleHoleClick = useCallback(() => setToasts((prev) =>
    prev.map((item) =>
      item.id === id
        ? item.held
          ? { ...item, state: ToastState.Open, closeAt: Date.now()+CLOSE_MILLIS, held: false }
          : { ...item, state: ToastState.Open, closeAt: Date.now()+HOLD_MILLIS, held: true }
        : item
    )
  ), [id]);

  return (
    <div
      className={cn(
        'w-96 max-w-dvw p-4 rounded-xl shadow-lg border-2 border-unknown/25 bg-background text-foreground gap-2 pointer-events-auto select-none grid grid-cols-[1fr_auto_auto] transition-in-right',
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
        onClick={handleHoleClick}
        className={cn('aspect-square p-1 text-foreground', held && 'text-background')}
      >
        <Pin />
      </Button>
      <Button variant='muted' onClick={handleCloseClick} className='aspect-square p-1 text-foreground'>
        <X />
      </Button>
      <span className='text-sm col-span-3'>{message}</span>
    </div>
  );
}

function Toaster() {
  const { toasts, setToasts } = useToast();
  const toastsRef = useRef(toasts);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  const updateToasts = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    if (!toastsRef.current.length) return;

    const now = Date.now();
    let updated = false;

    const nextToasts = toastsRef.current
      .map((toast) => {
        if (toast.closeAt < now) {
          updated = true;
          return null;
        }
        if (toast.closeAt - CLOSING_MILLIS < now && toast.state !== ToastState.Closing) {
          updated = true;
          return { ...toast, state: ToastState.Closing };
        }
        return toast;
      })
      .filter((item) => item !== null);

    if (updated) setToasts(nextToasts);
    else {
      const nextUpdateAt = toastsRef.current
        .map((toast) => Math.max(now, toast.closeAt - CLOSING_MILLIS))
        .toSorted((a, b) => a - b)[0];
      timeoutRef.current ??= setTimeout(updateToasts, Math.max(0, nextUpdateAt - now));
    }
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const now = Date.now();
    const nextUpdateAt = toasts
      .map((toast) => Math.max(now, toast.closeAt - CLOSING_MILLIS))
      .toSorted((a, b) => a - b)[0];
    timeoutRef.current ??= setTimeout(updateToasts, Math.max(0, nextUpdateAt - now));
  }, [toasts, updateToasts]);

  return (
    <div className='fixed bottom-0 right-0 max-h-dvh p-8 max-w-dvw pointer-events-none flex gap-4 flex-col'>
      {toasts.slice(-MAX_TOASTS).map((props) => (
        <Toast key={props.id} {...props} />
      ))}
    </div>
  );
}

let prevId = 0;
const THROTTLE_MILLIS = 300;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const { subscribe } = useSse();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toAddRef = useRef<Omit<ToastData, 'closeAt'>[]>([]);

  const showToast = useCallback((title: string, message: string, variant?: ServiceStatus) => {
    toAddRef.current.push({
      id: prevId++,
      message: `${message} at ${toLocalIso(new Date(), { endAt: 's' })}`,
      title,
      state: ToastState.Open,
      held: false,
      variant,
    });
    timeoutRef.current ??= setTimeout(() => {
      timeoutRef.current = null;
      if (!toAddRef.current.length) return;
      setToasts((prev) => {
        const closeAt = Date.now() + CLOSE_MILLIS;
        const next = [...prev, ...toAddRef.current.map((item) => ({ ...item, closeAt }))];
        toAddRef.current = [];
        return next;
      });
    }, THROTTLE_MILLIS);
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
      else throw new Error(`Unhandled toast kind ${(message satisfies never as { kind: string }).kind}`);
  }), [showToast]);

  // biome-ignore format: no
  const value: Context = useMemo(() => ({showToast, setToasts, toasts}), [toasts, showToast]);

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
