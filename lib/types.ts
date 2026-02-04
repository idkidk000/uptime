import { enumToObject } from '@/lib/utils';

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

/** make keys of `T` nullable */
export type Nullable<T> = { [P in keyof T]: T[P] | null };
