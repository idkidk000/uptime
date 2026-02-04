import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';
import { Icon, type IconVariant } from '@/components/icon';

const cache = new Map<IconVariant, Blob>();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ variant: IconVariant }> }) {
  const { variant } = await params;
  const blob = cache.get(variant) ?? (await new ImageResponse(Icon({ variant }), { width: 375, height: 375 }).blob());
  if (!cache.has(variant)) cache.set(variant, blob);
  return new NextResponse(blob, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
