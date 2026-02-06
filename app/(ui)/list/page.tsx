'use client';

import { redirect } from 'next/navigation';
import { useIsMobile } from '@/hooks/mobile';

// dummy page. the <Activity/> wrapping <ServiceList/> which is the sidebar in desktop is unhidden based on pathName
export default function ListPage() {
  const { isMobile } = useIsMobile();
  if (!isMobile) return redirect('/dashboard');
  return null;
}
