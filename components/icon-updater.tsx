'use client';

import { useEffect } from 'react';
import { useAppQueries } from '@/hooks/app-queries';
import { ServiceStatus } from '@/lib/types';

export function IconUpdater() {
  const { states } = useAppQueries();

  useEffect(() => {
    const alert = states.some((state) => state.status === ServiceStatus.Down);
    const href = `/api/icon/${alert ? 'alert' : 'default'}`;
    const links = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')];
    if (links.length) for (const link of links) link.href = href;
    else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [states]);

  return null;
}
