import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface Context {
  now: Date;
}

const Context = createContext<Context | null>(null);

/** for relative date components etc */
export function IntervalProvider({ millis = 60_000, children }: { millis?: number; children: ReactNode }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), millis);
    return () => clearInterval(interval);
  }, [millis]);

  const value: Context = useMemo(() => ({ now }), [now]);

  return <Context value={value}>{children}</Context>;
}

export function useInterval(): Context {
  const context = useContext(Context);
  if (context === null) throw new Error('useInterval must be used underneath an IntervalProvider');
  return context;
}
