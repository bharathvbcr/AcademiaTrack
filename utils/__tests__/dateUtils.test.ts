import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLocalDate, getDaysUntil, parseLocalDate, startOfToday } from '../dateUtils';

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseLocalDate', () => {
    it('parses a date-only string to local midnight', () => {
      const date = parseLocalDate('2026-07-01');
      expect(date).not.toBeNull();
      // Built from local parts, so the local calendar date is preserved
      // regardless of the host timezone (no UTC drift).
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(6); // July (0-indexed)
      expect(date!.getDate()).toBe(1);
      expect(date!.getHours()).toBe(0);
      expect(date!.getMinutes()).toBe(0);
    });

    it('ignores a time suffix and keeps the local calendar day', () => {
      const date = parseLocalDate('2026-07-01T15:30:00');
      expect(date!.getDate()).toBe(1);
      expect(date!.getMonth()).toBe(6);
      expect(date!.getHours()).toBe(0);
    });

    it('returns null for empty or invalid input', () => {
      expect(parseLocalDate(null)).toBeNull();
      expect(parseLocalDate(undefined)).toBeNull();
      expect(parseLocalDate('')).toBeNull();
      expect(parseLocalDate('not-a-date')).toBeNull();
    });
  });

  describe('getDaysUntil', () => {
    it('returns 0 for today regardless of the current time of day', () => {
      // Late evening local time — the previous (ceil-on-UTC) logic could drift.
      vi.setSystemTime(new Date(2026, 5, 30, 23, 30, 0)); // 2026-06-30 23:30 local
      expect(getDaysUntil('2026-06-30')).toBe(0);
    });

    it('counts whole calendar days into the future', () => {
      vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0)); // 2026-06-30 morning
      expect(getDaysUntil('2026-07-01')).toBe(1);
      expect(getDaysUntil('2026-07-07')).toBe(7);
    });

    it('returns negative values for past deadlines', () => {
      vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0));
      expect(getDaysUntil('2026-06-29')).toBe(-1);
      expect(getDaysUntil('2026-06-23')).toBe(-7);
    });

    it('returns null when the date is empty or invalid', () => {
      expect(getDaysUntil(null)).toBeNull();
      expect(getDaysUntil('')).toBeNull();
    });

    it('honors an explicit "from" date', () => {
      const from = new Date(2026, 0, 1); // 2026-01-01
      expect(getDaysUntil('2026-01-11', from)).toBe(10);
    });
  });

  describe('startOfToday', () => {
    it('returns the current local date at midnight', () => {
      vi.setSystemTime(new Date(2026, 2, 15, 14, 22, 33));
      const today = startOfToday();
      expect(today.getFullYear()).toBe(2026);
      expect(today.getMonth()).toBe(2);
      expect(today.getDate()).toBe(15);
      expect(today.getHours()).toBe(0);
    });
  });

  describe('formatLocalDate', () => {
    it('formats a date-only string on the local calendar day', () => {
      const formatted = formatLocalDate('2026-07-01', { year: 'numeric', month: '2-digit', day: '2-digit' });
      // The day component must be 01 (no UTC roll-back to June 30).
      expect(formatted).toContain('01');
      expect(formatted).toContain('2026');
    });

    it('returns a dash for empty input', () => {
      expect(formatLocalDate(null)).toBe('-');
      expect(formatLocalDate('')).toBe('-');
    });
  });
});
