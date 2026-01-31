import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

interface Context {
  modalRef: RefObject<HTMLDialogElement | null>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const Context = createContext<Context | null>(null);

export function Modal({ children }: { children: ReactNode }) {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  // biome-ignore format: no
  const value: Context = useMemo(() => ({
    modalRef,
    open() {
      modalRef.current?.showModal();
    },
    close() {
      modalRef.current?.close();
    },
    toggle() {
      if (modalRef.current?.open) modalRef.current.close();
      else modalRef.current?.showModal();
    },
  }), []);
  return <Context value={value}>{children}</Context>;
}

export function useModal(): Context {
  const context = useContext(Context);
  if (context === null) throw new Error('useModal must be used underneath a Modal');
  return context;
}

export function ModalTrigger({ children, onClick, ...props }: ComponentProps<typeof Button<'button'>>) {
  const { toggle } = useModal();

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    toggle()
    onClick?.(event);
  }, [onClick]);

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}

export function ModalClose({ children, onClick, ...props }: ComponentProps<typeof Button<'button'>>) {
  const { close } = useModal();

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    close();
    onClick?.(event);
  }, [onClick]);

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}

// TODO: firefox cannot transition backdrops
export function ModalContent({
  children,
  className,
  closedBy = 'any',
  onClick,
  onKeyDown,
}: ComponentPropsWithoutRef<'dialog'> & { closedBy?: 'any' | 'closerequest' | 'none' }) {
  const { modalRef } = useModal();

  // biome-ignore format: no
  const animatePulse = useCallback(() =>
    modalRef.current?.animate(
      [{ scale: '100%' }, { scale: '105%' }, { scale: '100%' }, { scale: '105%' }, { scale: '100%' }],
      { duration: 300, easing: 'ease-in-out' }
    ),
  []);

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (closedBy !== 'any' && event.target === modalRef.current) animatePulse();
    onClick?.(event);
  }, [onClick, animatePulse, closedBy]);

  // biome-ignore format: no
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDialogElement>) => {
    if (closedBy !== 'any' && event.key === 'Escape') animatePulse();
    onKeyDown?.(event);
  }, [onKeyDown, animatePulse, closedBy]);

  return (
    <dialog
      ref={modalRef}
      className={cn(
        'fixed inset-0 m-auto p-4 rounded-xl shadow border-foreground/10 bg-background-card border-2 opacity-0 translate-y-1/2 scale-90 open:opacity-100 open:translate-y-0 open:scale-100 starting:open:opacity-0 starting:open:-translate-y-1/2 starting:open:scale-90 transition-[opacity,translate,scale,display] transition-discrete duration-150 backdrop:bg-transparent open:backdrop:bg-black/33 starting:open:backdrop:bg-transparent backdrop:transition-[background-color,display] backdrop:transition-discrete backdrop:duration-150 pointer-events-none open:pointer-events-auto',
        className
      )}
      closedby={closedBy}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </dialog>
  );
}
