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
