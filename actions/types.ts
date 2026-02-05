export type ActionResponse<DataType> = Promise<{ ok: true; data: DataType } | { ok: false; error: string }>;
