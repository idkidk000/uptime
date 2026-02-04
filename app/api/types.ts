import type { NextResponse } from 'next/server';

export type ApiResponse<Data, ErrorType extends Error = Error> =
  | { ok: true; data: Data }
  | { ok: false; error: ErrorType };

export type WrappedApiResponse<Data, ErrorType extends Error = Error> = Promise<
  NextResponse<ApiResponse<Data, ErrorType>>
>;
