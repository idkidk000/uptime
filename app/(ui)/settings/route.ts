import { permanentRedirect } from 'next/navigation';

export function GET() {
  return permanentRedirect('/settings/general');
}
