/**
 * Format a Date as YYYY-MM-DD in the user's local calendar (same as plan-details page).
 * Use this everywhere progress is keyed by date (calendar, plan details, stats).
 */
export function formatDateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse API date values to a local calendar Date (no UTC day shift).
 */
export function parseApiDateLocal(dateValue: unknown): Date | null {
  if (!dateValue) return null;

  if (typeof dateValue === 'string') {
    if (dateValue.startsWith('{')) {
      try {
        const parsed = JSON.parse(dateValue);
        if (parsed.Year && parsed.Month && parsed.Day) {
          return new Date(parsed.Year, parsed.Month - 1, parsed.Day);
        }
      } catch {
        /* continue */
      }
    }
    const dateStr = dateValue.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof dateValue === 'object' && dateValue !== null) {
    const o = dateValue as { Year?: number; Month?: number; Day?: number };
    if (o.Year && o.Month && o.Day) {
      return new Date(o.Year, o.Month - 1, o.Day);
    }
  }

  const parsed = new Date(dateValue as string);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Normalize any API date field to YYYY-MM-DD (never use toISOString — it shifts the day).
 */
export function normalizeDateKeyFromApi(dateValue: unknown): string | null {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    if (dateValue.includes('T')) return dateValue.split('T')[0];
  }
  const d = parseApiDateLocal(dateValue);
  return d ? formatDateKeyLocal(d) : null;
}
