import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  createContext,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { Button } from '@/components/base/button';
import { cn } from '@/lib/utils';

interface Context {
  modalRef: RefObject<HTMLDialogElement | null>;
}

const Context = createContext<Context | null>(null);

export function Modal({ children }: { children: ReactNode }) {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const value: Context = useMemo(() => ({ modalRef: modalRef }), []);
  return <Context value={value}>{children}</Context>;
}

function useModal(): Context {
  const context = useContext(Context);
  if (context === null) throw new Error('useModal must be used underneath a Modal');
  return context;
}

export function ModalTrigger({ children, onClick, ...props }: ComponentProps<typeof Button<'button'>>) {
  const { modalRef } = useModal();

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (modalRef.current) {
      if (modalRef.current.open) modalRef.current.close();
      else modalRef.current.showModal();
    }
    onClick?.(event);
  }, [onClick]);

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}

export function ModalClose({ children, onClick, ...props }: ComponentProps<typeof Button<'button'>>) {
  const { modalRef } = useModal();

  // biome-ignore format: no
  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    modalRef.current?.close();
    onClick?.(event);
  }, [onClick]);

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}

// FIXME: firefox cannot transition backdrops
export function ModalContent({
  children,
  className,
  closedBy = 'any',
}: ComponentPropsWithoutRef<'dialog'> & { closedBy?: 'any' | 'closerequest' | 'none' }) {
  const { modalRef } = useModal();
  return (
    <dialog
      ref={modalRef}
      className={cn(
        'fixed inset-0 m-auto p-4 rounded-xl shadow border-foreground/10 bg-background-card border-2 opacity-0 -translate-y-1/2 scale-90 open:opacity-100 open:translate-y-0 open:scale-100 starting:open:opacity-0 starting:open:-translate-y-1/2 starting:open:scale-90 transition-[opacity,translate,scale] duration-150 backdrop:bg-transparent open:backdrop:bg-black/33 starting:open:backdrop:bg-transparent backdrop:transition-[background-color] backdrop:duration-150',
        className
      )}
      closedby={closedBy}
    >
      {children}
    </dialog>
  );
}
