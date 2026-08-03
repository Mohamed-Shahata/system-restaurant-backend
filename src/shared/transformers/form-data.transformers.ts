export function toBoolean({ value }: { value: unknown }): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}

export function toStringArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const parsedAsJson = tryParseJsonArray(trimmed);
    if (parsedAsJson) return parsedAsJson;

    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return value;
}

function tryParseJsonArray(input: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `[form-data.transformers] toStringArray: "${input}" ليست JSON صالح، هيتم التعامل معها كنص مفصول بفواصل.`,
        error instanceof Error ? error.message : error,
      );
    }
    return null;
  }
}

export function toJsonArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const parsed = tryParseJsonArray(trimmed);
    if (parsed) return parsed;
  }

  return value;
}
