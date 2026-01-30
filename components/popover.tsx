import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  type ToggleEvent,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

const RE_DISPLAY =
  /(?<![:-])(table-column-group|table-footer-group|table-header-group|table-row-group|table-caption|inline-block|inline-table|table-column|inline-flex|inline-grid|not-sr-only|table-cell|flow-root|list-item|table-row|contents|sr-only|hidden|inline|block|table|flex|grid)( |$)/gm;

interface Context {
  popoverId: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const Context = createContext<Context | null>(null);

export function Popover({ children }: { children: [ReactNode, ReactNode] }) {
  const popoverId = useId();
  // there is no way to style a popover trigger based on the open state of its target
  const [open, setOpen] = useState(false);
  const value: Context = useMemo(() => ({ popoverId, open, setOpen }), [popoverId, open]);
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
  className,
  ...props
}: Omit<ComponentProps<typeof Button<'button'>>, 'as' | 'type' | 'popoverTarget'>) {
  const { open, popoverId } = usePopover();

  // biome-ignore format: no
  const style: CSSProperties = useMemo(() => ({
    anchorName: `--trigger-${popoverId}`,
  }), [popoverId]);

  return (
    <Button
      as='button'
      type='button'
      popoverTargetAction={popoverTargetAction}
      popoverTarget={popoverId}
      style={style}
      data-open={open || undefined}
      className={cn('data-open:border-up', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PopoverClose({
  children,
  popoverTargetAction = 'hide',
  ...props
}: Omit<ComponentProps<typeof Button<'button'>>, 'as' | 'type' | 'popoverTarget'>) {
  const { popoverId } = usePopover();

  return (
    <Button as='button' type='button' popoverTargetAction={popoverTargetAction} popoverTarget={popoverId} {...props}>
      {children}
    </Button>
  );
}

// TODO: deal with this nonsense
/** The 'gotchas' of `popover` and anchor positioning (which i have wasted so much time on):
 * - the implicit anchor gets immediately removed on close before the animation has completed. transitioning all properties, including discrete makes no difference. defining the anchor relationship in css is a workaround
 * - firefox does not move implicitly anchor positioned popovers with their anchor, i.e. on scroll. defining the anchor relationship in css is a workaround
 * - firefox does not animate popover close. fixing this needs code to swap out classNames. onBeforeToggle only allows you to cancel opening. so i'd have to set `popover='manual'`, have an open|closing|closed state, add an onClick to the trigger to toggle open|closing, add native onClick and onTouchStart to the popover with useEffect so i can catch the bubbled ::backdrop events, add an onKeyDown to the popover to catch 'esc', use a timeout to switch from closing to closed, use a ternary in classNames, and probably more
 * - setting `display` to any value overrides the implicit `display:none` when closed. prefix display classes with an `open:` selector
 */
// https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using
// https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Using
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/beforetoggle_event
export function PopoverContent({
  children,
  className,
  popover = 'auto',
  alignment = 'center',
  onToggle,
}: ComponentProps<'div'> & { alignment?: 'left' | 'center' | 'right' }) {
  const { popoverId, setOpen } = usePopover();

  // biome-ignore format: no
  const style: CSSProperties = useMemo(() => ({
    positionAnchor: `--trigger-${popoverId}`,
    // tailwind isn't generating a class for this
    // ...(alignment === 'full' ? {width: 'anchor-size(width)'} : {}),
  }), [popoverId]);

  const handleToggle = useCallback(
    (event: ToggleEvent<HTMLDivElement>) => {
      setOpen(event.newState === 'open');
      onToggle?.(event);
    },
    [onToggle]
  );

  const merged = cn(
    'top-[anchor(bottom)] p-2 rounded-xl shadow border-foreground/10 bg-background-card border-2 opacity-0 -translate-y-1/2 scale-90 open:opacity-100 open:translate-y-0 open:scale-100 starting:open:opacity-0 starting:open:-translate-y-1/2 starting:open:scale-90 transition-all transition-discrete duration-150 ',
    alignment === 'center' && '[justify-self:anchor-center]',
    alignment === 'left' && 'left-[anchor(left)]',
    alignment === 'right' && 'right-[anchor(right)]',
    // alignment === 'full' && 'left-[anchor(left)] right-[anchor(right)] width-[anchor-size(width)]',
    className
  );
  const match = RE_DISPLAY.exec(merged);
  if (match)
    throw new Error(
      `You cannot assign display classNames to a popover. Prefix them with 'open:' or remove them. Found: ${match.slice(1).join(', ')}`
    );

  return (
    <div id={popoverId} popover={popover} className={merged} style={style} onToggle={handleToggle}>
      {children}
    </div>
  );
}
