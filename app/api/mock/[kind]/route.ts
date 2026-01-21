import { type NextRequest, NextResponse } from 'next/server';

const ERROR_RATE = 0.2;
const MAX_DELAY = 300;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;

  if (kind !== 'json' && kind !== 'xml')
    return NextResponse.json({ ok: false, error: 'Invalid kind. Use either "json" or "xml"' }, { status: 404 });

  await new Promise((resolve) => setTimeout(resolve, Math.random() * MAX_DELAY));

  if (kind === 'json') {
    if (Math.random() > ERROR_RATE) return NextResponse.json({ ok: true, data: 'some value' });
    return NextResponse.json({ ok: false, error: 'Intermittent error' }, { status: 500 });
  }

  if (kind === 'xml') {
    if (Math.random() > ERROR_RATE)
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <message>
          <ok>true</ok>
          <data>some value</data>
        </message>`,
        { headers: { 'Content-Type': 'application/xml' } }
      );
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
        <message>
          <ok>false</ok>
          <error>Intermittent error</error>
        </message>`,
      { headers: { 'Content-Type': 'application/xml' }, status: 500 }
    );
  }
}
