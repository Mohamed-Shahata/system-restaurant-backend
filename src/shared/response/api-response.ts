export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface PaginatedApiResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export function ok<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { success: true, message, data };
}

export function paginated<T>(
  data: T[],
  meta: PaginationMeta,
  message = 'Success',
): PaginatedApiResponse<T> {
  return { success: true, message, data, meta };
}
