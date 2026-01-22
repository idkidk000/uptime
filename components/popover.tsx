import { type ComponentProps, createContext, type ReactNode, useContext, useId, useMemo } from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

interface Context {
  popoverId: string;
}

const Context = createContext<Context | null>(null);

export function Popover({ children }: { children: [ReactNode, ReactNode] }) {
  const popoverId = useId();
  const value: Context = useMemo(() => ({ popoverId }), [popoverId]);
  return <Context value={value}>{children}</Context>;
}

function usePopover(): Context {
  const context = useContext(Context);
  if (context === null) throw new Error('usePopover must be used underneath a Popover');
  return context;
}

export function PopoverTrigger({
  children,
  popoverTargetAction = 'toggle',
  ...props
}: Omit<ComponentProps<typeof Button<'button'>>, 'as' | 'type' | 'popoverTarget'>) {
  const { popoverId } = usePopover();
  return (
    <Button
      as='button'
      type='button'
      popoverTargetAction={popoverTargetAction}
      popoverTarget={popoverId}
      // style={{
      //   anchorName: `--trigger-${popoverId}`,
      // }}
      {...props}
    >
      {children}
    </Button>
  );
}

// BUG: popover implicit anchor positioning is quite dissapointing
// - the implicit anchor gets immediately removed on close before the animation has completed so the popover just moves to the bottom middle of the screen
// - defining anchors manually completely breaks popover behaviour - they're always open
// - in firefox, the popover is left behind on scroll
// https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using
// https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Using
export function PopoverContent({ children, className, popover = 'auto' }: Omit<ComponentProps<'div'>, 'ref'>) {
  const { popoverId } = usePopover();

  //[position-anchor:--popover-trigger]
  return (
    <div
      id={popoverId}
      popover={popover}
      className={cn(
        'top-[anchor(bottom)] [justify-self:anchor-center] p-2 rounded-xl shadow border-foreground/10 bg-background-card border-2 opacity-0 -translate-y-1/2 scale-90 open:opacity-100 open:translate-y-0 open:scale-100 starting:open:opacity-0 starting:open:-translate-y-1/2 starting:open:scale-90 transition-[opacity,translate,scale] duration-200',
        className
      )}
      // style={{
      //   positionAnchor: `--trigger-${popoverId}`,
      // }}
    >
      {children}
    </div>
  );
}
