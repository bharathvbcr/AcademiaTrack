import { describe, expect, it } from 'vitest';
import { ApplicationStatus } from '../../types';
import { planUniversityRename, planUniversityStatus } from '../universityBatch';

const row = (id: string, universityName: string, status = ApplicationStatus.NotStarted) => ({
  id,
  universityName,
  status,
});

describe('planUniversityRename', () => {
  const apps = [row('1', 'Stanford'), row('2', ' stanford '), row('3', 'MIT')];

  it('renames every case variant and reports a merge into an existing school', () => {
    const plan = planUniversityRename(apps, 'Stanford', '  MIT  ');
    expect(plan).toMatchObject({
      ok: true,
      nextName: 'MIT',
      mergeCount: 1,
      mergeName: 'MIT',
    });
    if (plan.ok) expect(plan.changed.map(app => app.id)).toEqual(['1', '2']);
  });

  it('keeps a case-only change when the grouping key stays the same', () => {
    const plan = planUniversityRename(apps, 'Stanford', 'Stanford');
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.mergeCount).toBe(0);
      expect(plan.changed.map(app => app.id)).toEqual(['2']);
    }
  });

  it('rejects an empty, oversized, missing, or identical name', () => {
    const empty = planUniversityRename(apps, 'Stanford', '   ');
    const oversized = planUniversityRename(apps, 'Stanford', 'x'.repeat(201));
    const missing = planUniversityRename(apps, 'Nowhere', 'Yale');
    const unchanged = planUniversityRename([row('1', 'MIT')], 'MIT', 'MIT');
    expect(empty.ok).toBe(false);
    expect(oversized.ok).toBe(false);
    expect(missing.ok).toBe(false);
    expect(unchanged.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe('empty');
    if (!oversized.ok) expect(oversized.reason).toBe('too-long');
    if (!missing.ok) expect(missing.reason).toBe('missing');
    if (!unchanged.ok) expect(unchanged.reason).toBe('unchanged');
  });
});

describe('planUniversityStatus', () => {
  it('selects only the programs whose status would change', () => {
    const apps = [
      row('1', 'Stanford', ApplicationStatus.NotStarted),
      row('2', 'Stanford', ApplicationStatus.Submitted),
      row('3', 'MIT', ApplicationStatus.NotStarted),
    ];
    const plan = planUniversityStatus(apps, 'stanford', ApplicationStatus.Submitted);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.school).toBe('Stanford');
      expect(plan.changed.map(app => app.id)).toEqual(['1']);
    }
    const unchanged = planUniversityStatus(apps, 'MIT', ApplicationStatus.NotStarted);
    const missing = planUniversityStatus(apps, 'Yale', ApplicationStatus.Submitted);
    expect(unchanged.ok).toBe(false);
    expect(missing.ok).toBe(false);
    if (!unchanged.ok) expect(unchanged.reason).toBe('unchanged');
    if (!missing.ok) expect(missing.reason).toBe('missing');
  });
});
