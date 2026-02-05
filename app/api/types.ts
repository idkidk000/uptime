import type { NextResponse } from 'next/server';

export type ApiResponse<Data> = { ok: true; data: Data } | { ok: false; error: string };

export type WrappedApiResponse<Data> = Promise<NextResponse<ApiResponse<Data>>>;
