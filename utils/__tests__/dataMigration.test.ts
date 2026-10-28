import { describe, expect, it } from 'vitest';
import { migrateData } from '../dataMigration';
import { ensureApplicationDefaults } from '../applicationDefaults';

describe('migrateData', () => {
  it('keeps an unversioned object that already has an applications array', () => {
    const migrated = migrateData({
      applications: [{ id: 'old', universityName: 'CMU', programName: 'ML' }],
      extraRoot: 'keep',
    });
    expect(migrated.version).toBe(3);
    expect(migrated.applications).toHaveLength(1);
    expect(migrated.applications[0].universityName).toBe('CMU');
    expect((migrated as { extraRoot?: string }).extraRoot).toBe('keep');
  });

  it('does not invent applications from an unrecognized value', () => {
    const migrated = migrateData({ nope: 1 });
    expect(migrated.applications).toEqual([]);
    expect(migrated.version).toBe(3);
  });
});

describe('ensureApplicationDefaults', () => {
  it('fills the form shape and keeps fields that are already set', () => {
    const filled = ensureApplicationDefaults({
      id: 'row',
      universityName: 'Yale',
      programName: 'CS',
      extraField: 'kept',
    } as never);
    expect(filled.status).toBe('Not Started');
    expect(filled.programType).toBe('PhD');
    expect(filled.applicationFee).toBe(0);
    expect(filled.feeWaiverStatus).toBe('Not Requested');
    expect(filled.documents.cv.required).toBe(true);
    expect(filled.documents.lor1.required).toBe(false);
    expect(filled.financialOffer?.received).toBe(false);
    expect(filled.financialOffer?.stipendFrequency).toBe('Yearly');
    expect(filled.gre.status).toBe('Not Applicable');
    expect((filled as { extraField?: string }).extraField).toBe('kept');
  });
});
