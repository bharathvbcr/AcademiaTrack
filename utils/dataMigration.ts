import { Application } from '../types';

// Current schema version
export const CURRENT_DATA_VERSION = 3;

export interface DataSchema {
    version: number;
    applications: Application[];
    lastUpdated: string;
}

/**
 * Migration functions - each migrates from version N to N+1
 */
type MigrationFn = (data: unknown) => unknown;

const migrations: Record<number, MigrationFn> = {
    // Version 0 -> 1: Initial migration from raw array to versioned schema
    // This handles legacy data that was just an array of applications
    0: (data: unknown): DataSchema => {
        const applications = Array.isArray(data) ? data : [];
        return {
            version: 1,
            applications: applications as Application[],
            lastUpdated: new Date().toISOString(),
        };
    },
    // Version 1 -> 2: Add isPinned, statusHistory, admissionChance fields
    1: (data: unknown): DataSchema => {
        const schema = data as DataSchema;
        const apps = Array.isArray(schema?.applications) ? schema.applications : [];
        const migratedApps = apps.map(app => ({
            ...app,
            isPinned: app.isPinned ?? false,
            statusHistory: app.statusHistory ?? [],
            admissionChance: app.admissionChance ?? undefined,
        }));
        return {
            version: 2,
            applications: migratedApps,
            lastUpdated: new Date().toISOString(),
        };
    },
    // Version 2 -> 3: Add decisionDeadline field
    2: (data: unknown): DataSchema => {
        const schema = data as DataSchema;
        const apps = Array.isArray(schema?.applications) ? schema.applications : [];
        const migratedApps = apps.map(app => ({
            ...app,
            decisionDeadline: app.decisionDeadline ?? undefined,
        }));
        return {
            version: 3,
            applications: migratedApps,
            lastUpdated: new Date().toISOString(),
        };
    },
};

/**
 * Detects the version of the data
 */
export function detectDataVersion(data: unknown): number {
    if (!data) return 0;

    // If it's an array, it's legacy (version 0)
    if (Array.isArray(data)) return 0;

    // If it has a version field, use that
    if (typeof data === 'object' && data !== null && 'version' in data) {
        return (data as { version: number }).version;
    }

    return 0;
}

/**
 * Migrates data from its current version to the latest version
 */
export function migrateData(data: unknown): DataSchema {
    let currentVersion = detectDataVersion(data);
    let currentData = data;

    // Data from a NEWER app version: don't attempt to downgrade or blindly cast
    // unknown structure. If it already looks like a valid schema, keep it as-is
    // (forward compatibility — unknown fields are preserved by spreads elsewhere);
    // otherwise fall back to an empty schema rather than corrupting state.
    if (currentVersion >= CURRENT_DATA_VERSION) {
        if (validateDataSchema(currentData)) {
            return currentData;
        }
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`Data reports version ${currentVersion} but failed schema validation; using empty schema`);
        }
        return createEmptyDataSchema();
    }

    // Apply migrations sequentially until we reach the current version
    while (currentVersion < CURRENT_DATA_VERSION) {
        const migration = migrations[currentVersion];
        if (!migration) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`No migration found for version ${currentVersion}`);
            }
            break;
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log(`Migrating data from version ${currentVersion} to ${currentVersion + 1}`);
        }
        try {
            currentData = migration(currentData);
        } catch (error) {
            // A single failing migration must not crash the whole load. Surface the
            // error and stop migrating; the partially-migrated (or original) data is
            // validated by the caller before use.
            console.error(`Migration from version ${currentVersion} failed:`, error);
            break;
        }
        currentVersion++;
    }

    return validateDataSchema(currentData) ? currentData : createEmptyDataSchema();
}

/**
 * Creates an empty data structure with the current version
 */
export function createEmptyDataSchema(): DataSchema {
    return {
        version: CURRENT_DATA_VERSION,
        applications: [],
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Wraps applications in the current schema format for saving
 */
export function wrapInSchema(applications: Application[]): DataSchema {
    return {
        version: CURRENT_DATA_VERSION,
        applications,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Validates that the data matches expected schema structure
 */
export function validateDataSchema(data: unknown): data is DataSchema {
    if (!data || typeof data !== 'object') return false;

    const schema = data as DataSchema;
    return (
        typeof schema.version === 'number' &&
        Array.isArray(schema.applications) &&
        typeof schema.lastUpdated === 'string'
    );
}
