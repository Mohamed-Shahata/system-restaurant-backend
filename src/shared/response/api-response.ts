/**
 * ─── Unified API Response ────────────────────────────────────────────────────
 *
 * كل endpoint في المشروع يرجع الداتا بالشكل ده:
 *
 * Success (single item / message-only):
 * {
 *   success: true,
 *   message: "...",
 *   data: <T> | null
 * }
 *
 * Success (paginated list):
 * {
 *   success: true,
 *   message: "...",
 *   data: <T[]>,
 *   meta: { total, page, limit, totalPages }
 * }
 *
 * الـ Error shape بيتعمل في GlobalExceptionFilter (موجود بالفعل).
 */

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

// ─── Helper functions (بتستخدمهم في الـ service أو controller) ──────────────

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
