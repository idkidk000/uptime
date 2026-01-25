import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useMemo,
} from 'react';
import { Button } from '@/components/base/button';
import { cn } from '@/lib/utils';

const RE_DISPLAY =
  /(?<![:-])(table-column-group|table-footer-group|table-header-group|table-row-group|table-caption|inline-block|inline-table|table-column|inline-flex|inline-grid|not-sr-only|table-cell|flow-root|list-item|table-row|contents|sr-only|hidden|inline|block|table|flex|grid)( |$)/gm;

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
      {...props}
    >
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
export function PopoverContent({ children, className, popover = 'auto' }: ComponentProps<'div'>) {
  const { popoverId } = usePopover();

  // biome-ignore format: no
  const style: CSSProperties = useMemo(() => ({
    positionAnchor: `--trigger-${popoverId}`,
  }), [popoverId]);

  const merged = cn(
    'top-[anchor(bottom)] [justify-self:anchor-center] p-2 rounded-xl shadow border-foreground/10 bg-background-card border-2 opacity-0 -translate-y-1/2 scale-90 open:opacity-100 open:translate-y-0 open:scale-100 starting:open:opacity-0 starting:open:-translate-y-1/2 starting:open:scale-90 transition-all transition-discrete duration-200',
    className
  );
  const match = RE_DISPLAY.exec(merged);
  if (match)
    throw new Error(
      `You cannot assign display classNames to a popover. Prefix them with 'open:' or remove them. Found: ${match.slice(1).join(', ')}`
    );

  return (
    <div id={popoverId} popover={popover} className={merged} style={style}>
      {children}
    </div>
  );
}
