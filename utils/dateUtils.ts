/**
 * Date helpers for deadline math.
 *
 * Deadlines are stored as calendar dates (e.g. "2026-07-01"), with no time or
 * timezone component. The native `new Date("2026-07-01")` parses such strings as
 * UTC midnight, so for any user east or west of UTC the instant lands on a
 * different local calendar day. That made "days until deadline" — and therefore
 * the dashboard counts, deadline filters, urgency badges, and notifications —
 * off by one for many users.
 *
 * These helpers always interpret a date-only string in the user's *local*
 * calendar and compare whole days, so a deadline of "today" reads as 0 days
 * regardless of timezone.
 */

/** Parse a date string to a Date at local midnight, or null if invalid/empty. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  // Fast path for the canonical "YYYY-MM-DD" (optionally with a time suffix we
  // ignore): build the date from its parts so it lands on local midnight.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    // Reject out-of-range parts up front: the Date constructor would otherwise
    // silently roll them over (e.g. 2026-13-45 -> 2027-02-14).
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    // Guard against rollover within a month (e.g. 2026-02-31 -> Mar 3).
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Fallback for other formats: parse, then normalize to local midnight.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/** The current date at local midnight. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Whole calendar days from `from` (defaults to today) until the given date.
 * Negative when the date is in the past, 0 when it is today, null when the
 * value is empty/invalid. DST transitions are handled by rounding.
 */
export function getDaysUntil(
  value: string | null | undefined,
  from: Date = startOfToday()
): number | null {
  const target = parseLocalDate(value);
  if (!target) return null;
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diffMs = target.getTime() - fromMidnight.getTime();
  // Round (not ceil/floor) so a ~1h DST shift doesn't change the day count.
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Format a date-only string for display in the user's locale (local calendar). */
export function formatLocalDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseLocalDate(value);
  if (!date) return '-';
  return date.toLocaleDateString(undefined, options);
}
