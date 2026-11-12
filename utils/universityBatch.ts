import { ApplicationStatus } from '../types';

/** Universities match on trimmed, case-insensitive names. Empty names group together. */
export const universityKey = (name: string) => name.trim().toLowerCase();

export const MAX_UNIVERSITY_NAME_LENGTH = 200;

type Named = { id: string; universityName: string };

export type UniversityRenamePlan<T extends Named> =
  | { ok: false; reason: 'empty' | 'too-long' | 'missing' | 'unchanged' }
  | {
      ok: true;
      nextName: string;
      changed: T[];
      mergeCount: number;
      mergeName: string | null;
    };

export function planUniversityRename<T extends Named>(
  apps: T[],
  currentName: string,
  nextNameRaw: string,
): UniversityRenamePlan<T> {
  const nextName = nextNameRaw.trim();
  if (!nextName) return { ok: false, reason: 'empty' };
  if (nextName.length > MAX_UNIVERSITY_NAME_LENGTH) return { ok: false, reason: 'too-long' };

  const currentKey = universityKey(currentName);
  const matches = apps.filter(app => universityKey(app.universityName) === currentKey);
  if (matches.length === 0) return { ok: false, reason: 'missing' };

  const changed = matches.filter(app => app.universityName !== nextName);
  if (changed.length === 0) return { ok: false, reason: 'unchanged' };

  const nextKey = universityKey(nextName);
  const mergeTargets = nextKey === currentKey
    ? []
    : apps.filter(app => universityKey(app.universityName) === nextKey);

  return {
    ok: true,
    nextName,
    changed,
    mergeCount: mergeTargets.length,
    mergeName: mergeTargets[0]?.universityName ?? null,
  };
}

type StatusRow = Named & { status: ApplicationStatus };

export type UniversityStatusPlan<T extends StatusRow> =
  | { ok: false; reason: 'missing' | 'unchanged' }
  | { ok: true; school: string; changed: T[] };

export function planUniversityStatus<T extends StatusRow>(
  apps: T[],
  universityName: string,
  status: ApplicationStatus,
): UniversityStatusPlan<T> {
  const matches = apps.filter(app => universityKey(app.universityName) === universityKey(universityName));
  if (matches.length === 0) return { ok: false, reason: 'missing' };
  const changed = matches.filter(app => app.status !== status);
  if (changed.length === 0) return { ok: false, reason: 'unchanged' };
  return { ok: true, school: matches[0].universityName, changed };
}
