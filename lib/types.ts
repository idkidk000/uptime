import { enumToObject } from '@/lib/utils';

export type ApiResponse<Data> =
  | {
      ok: true;
      data: Data;
    }
  | {
      ok: false;
      error: string;
    };

export interface Paginated<Data> {
  page: number;
  pages: number;
  data: Data;
}

export enum ServiceStatus {
  Up,
  Down,
  Pending,
  Paused,
}
export type ServiceStatusName = keyof typeof ServiceStatus;
export const serviceStatuses = enumToObject(ServiceStatus);
