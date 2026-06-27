import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeadlineInfo } from '../../constants';

describe('getDeadlineInfo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a deadline of today as "Today!" even late in the evening', () => {
    vi.setSystemTime(new Date(2026, 5, 30, 22, 0, 0)); // 2026-06-30 22:00 local
    const info = getDeadlineInfo('2026-06-30');
    expect(info.daysLeft).toBe(0);
    expect(info.label).toBe('Today!');
    expect(info.urgency).toBe('urgent');
  });

  it('classifies near-term deadlines as urgent', () => {
    vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0));
    expect(getDeadlineInfo('2026-07-05').urgency).toBe('urgent'); // 5 days
  });

  it('classifies deadlines within a month as soon', () => {
    vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0));
    expect(getDeadlineInfo('2026-07-20').urgency).toBe('soon'); // 20 days
  });

  it('classifies far-off deadlines as normal', () => {
    vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0));
    expect(getDeadlineInfo('2026-09-01').urgency).toBe('normal');
  });

  it('marks past deadlines accordingly', () => {
    vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0));
    const info = getDeadlineInfo('2026-06-29');
    expect(info.daysLeft).toBe(-1);
    expect(info.urgency).toBe('past');
  });

  it('returns the empty/none result when no deadline is set', () => {
    expect(getDeadlineInfo(null)).toEqual({ daysLeft: null, label: '', colorClass: '', urgency: 'none' });
  });
});
