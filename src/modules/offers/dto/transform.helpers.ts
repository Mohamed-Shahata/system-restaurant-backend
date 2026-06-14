// ─── Helpers لتحويل القيم القادمة من multipart/form-data ───────────────────────
// في multipart/form-data كل القيم بتوصل كـ string، فلازم نحوّلها يدوياً
// قبل ما الـ class-validator يشتغل عليها.

/**
 * يحوّل القيمة النصية القادمة من الفورم إلى boolean حقيقي.
 * 'true' / 'false' (case-insensitive) → true / false
 */
export function toBoolean({ value }: { value: unknown }): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}

/**
 * يحوّل القيمة القادمة من الفورم إلى array of strings.
 * يقبل: array جاهز، JSON array كـ string، أو نص مفصول بفواصل "id1,id2".
 */
export function toStringArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ليس JSON — نتعامل معه كنص مفصول بفواصل
    }

    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return value;
}
