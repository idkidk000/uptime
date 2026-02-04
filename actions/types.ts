export type ActionResponse<DataType, ErrorType extends Error = Error> = Promise<
  { ok: true; data: DataType } | { ok: false; error: ErrorType }
>;
