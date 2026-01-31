'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';

const breakpoint = 768; // md, 48rem

interface Context {
  isMobile: boolean;
}

const Context = createContext<Context | null>(null);

export function IsMobileProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const isMobileRef = useRef(isMobile);

  useEffect(() => {
    function update() {
      const next = window.innerWidth < breakpoint;
      if (next === isMobileRef.current) return;
      isMobileRef.current = next;
      setIsMobile(next);
    }
    const controller = new AbortController();
    window.addEventListener('resize', update);
    update();
    return () => controller.abort();
  }, []);

  const value: Context = useMemo(() => ({ isMobile }), [isMobile]);

  return <Context value={value}>{children}</Context>;
}

export function useIsMobile(): Context {
  const context = useContext(Context);
  if (!context) throw new Error('useIsMobile must be used underneath an IsMobileProvider');
  return context;
}
