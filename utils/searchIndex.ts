import { Application } from '../types';

export interface SearchIndex {
  [key: string]: Set<string>; // term -> set of application IDs
}

export interface IndexStats {
  indexedApplications: number;
  indexTerms: number;
  totalIndexEntries: number;
  lastUpdated: number;
  health: 'healthy' | 'degraded' | 'needs_rebuild';
}

export class ApplicationSearchIndex {
  private index: SearchIndex = {};
  private applications: Map<string, Application> = new Map();
  private pendingUpdates: Set<string> = new Set();
  private updateTimer: number | null = null;
  private readonly BATCH_UPDATE_DELAY = 100; // ms
  private readonly STORAGE_KEY = 'academiatrack-search-index';
  private lastRebuildTime: number = Date.now();

  constructor() {
    this.loadFromStorage();
  }

  indexApplication(app: Application) {
    this.applications.set(app.id, app);
    this.removeFromIndex(app.id);
    this.addToIndex(app);
    this.scheduleBatchUpdate();
  }

  indexApplicationsBatch(apps: Application[]) {
    apps.forEach(app => {
      this.applications.set(app.id, app);
      this.removeFromIndex(app.id);
      this.addToIndex(app);
    });
    this.scheduleBatchUpdate();
  }

  removeApplication(id: string) {
    this.removeFromIndex(id);
    this.applications.delete(id);
    this.scheduleBatchUpdate();
  }

  private scheduleBatchUpdate() {
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = window.setTimeout(() => {
      this.saveToStorage();
      this.updateTimer = null;
    }, this.BATCH_UPDATE_DELAY);
  }

  private addToIndex(app: Application) {
    const terms = this.extractTerms(app);
    terms.forEach(term => {
      if (!this.index[term]) {
        this.index[term] = new Set();
      }
      this.index[term].add(app.id);
    });
  }

  private removeFromIndex(id: string) {
    Object.keys(this.index).forEach(term => {
      this.index[term].delete(id);
      if (this.index[term].size === 0) {
        delete this.index[term];
      }
    });
  }

  // Incremental update: only update changed applications
  updateApplications(applications: Application[]) {
    const currentIds = new Set(this.applications.keys());
    const newIds = new Set(applications.map(app => app.id));
    
    // Find added/updated applications
    const toAddOrUpdate: Application[] = [];
    applications.forEach(app => {
      if (!this.applications.has(app.id)) {
        toAddOrUpdate.push(app);
      } else {
        // Check if application changed (simple comparison)
        const existing = this.applications.get(app.id);
        if (existing && this.hasApplicationChanged(existing, app)) {
          toAddOrUpdate.push(app);
        }
      }
    });

    // Find removed applications
    const toRemove: string[] = [];
    currentIds.forEach(id => {
      if (!newIds.has(id)) {
        toRemove.push(id);
      }
    });

    // Batch process changes
    if (toRemove.length > 0) {
      toRemove.forEach(id => this.removeApplication(id));
    }

    if (toAddOrUpdate.length > 0) {
      this.indexApplicationsBatch(toAddOrUpdate);
    }

    // If too many changes, rebuild for efficiency
    const changeRatio = (toAddOrUpdate.length + toRemove.length) / Math.max(applications.length, 1);
    if (changeRatio > 0.5) {
      this.rebuild(applications);
    }
  }

  private hasApplicationChanged(oldApp: Application, newApp: Application): boolean {
    // Compare key searchable fields
    return (
      oldApp.universityName !== newApp.universityName ||
      oldApp.programName !== newApp.programName ||
      oldApp.department !== newApp.department ||
      oldApp.location !== newApp.location ||
      oldApp.notes !== newApp.notes ||
      JSON.stringify(oldApp.tags) !== JSON.stringify(newApp.tags) ||
      JSON.stringify(oldApp.facultyContacts) !== JSON.stringify(newApp.facultyContacts)
    );
  }

  private extractTerms(app: Application): string[] {
    const terms: string[] = [];
    
    // University name
    this.tokenize(app.universityName).forEach(term => terms.push(term));
    
    // Program name
    this.tokenize(app.programName).forEach(term => terms.push(term));
    
    // Department
    if (app.department) {
      this.tokenize(app.department).forEach(term => terms.push(term));
    }
    
    // Location
    if (app.location) {
      this.tokenize(app.location).forEach(term => terms.push(term));
    }
    
    // Notes
    if (app.notes) {
      this.tokenize(app.notes).forEach(term => terms.push(term));
    }
    
    // Faculty contacts
    app.facultyContacts?.forEach(faculty => {
      this.tokenize(faculty.name).forEach(term => terms.push(term));
      if (faculty.researchArea) {
        this.tokenize(faculty.researchArea).forEach(term => terms.push(term));
      }
    });
    
    // Tags
    app.tags?.forEach(tag => {
      this.tokenize(tag).forEach(term => terms.push(term));
    });
    
    return terms;
  }

  private tokenize(text: string): string[] {
    const normalized = text.toLowerCase();
    const words = normalized.split(/\s+/);
    const terms: string[] = [];
    
    // Add individual words
    words.forEach(word => {
      if (word.length >= 2) {
        terms.push(word);
        // Add prefixes for fuzzy matching
        for (let i = 2; i <= word.length; i++) {
          terms.push(word.substring(0, i));
        }
      }
    });
    
    // Add full phrase
    if (normalized.length >= 3) {
      terms.push(normalized);
    }
    
    return terms;
  }

  search(query: string): Application[] {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) {
      return Array.from(this.applications.values());
    }

    const matchingIds = new Map<string, number>(); // ID -> score
    
    queryTerms.forEach(term => {
      Object.keys(this.index).forEach(indexedTerm => {
        if (indexedTerm.includes(term) || term.includes(indexedTerm)) {
          this.index[indexedTerm].forEach(id => {
            matchingIds.set(id, (matchingIds.get(id) || 0) + 1);
          });
        }
      });
    });

    // Sort by relevance score
    const sortedIds = Array.from(matchingIds.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    return sortedIds
      .map(id => this.applications.get(id))
      .filter((app): app is Application => app !== undefined);
  }

  rebuild(applications: Application[]) {
    this.index = {};
    this.applications.clear();
    applications.forEach(app => {
      this.applications.set(app.id, app);
      this.addToIndex(app);
    });
    this.lastRebuildTime = Date.now();
    this.saveToStorage();
  }

  getStats(): IndexStats {
    let health: 'healthy' | 'degraded' | 'needs_rebuild' = 'healthy';
    
    // Determine health status
    const indexedApplications = this.applications.size;
    const indexTerms = Object.keys(this.index).length;
    const totalIndexEntries = Object.values(this.index).reduce((sum, set) => sum + set.size, 0);
    
    if (indexedApplications === 0 && indexTerms === 0) {
      health = 'needs_rebuild';
    } else if (indexTerms === 0 || totalIndexEntries === 0) {
      health = 'degraded';
    }

    const stats: IndexStats = {
      indexedApplications,
      indexTerms,
      totalIndexEntries,
      lastUpdated: this.lastRebuildTime,
      health,
    };

    return stats;
  }

  // Persistence methods
  private saveToStorage() {
    try {
      // Only save index metadata, not full index (too large)
      const metadata = {
        indexedCount: this.applications.size,
        indexTermsCount: Object.keys(this.index).length,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save search index metadata:', error);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const metadata = JSON.parse(stored);
        this.lastRebuildTime = metadata.lastUpdated || Date.now();
      }
    } catch (error) {
      console.warn('Failed to load search index metadata:', error);
    }
  }

  // Clear index (useful for debugging or reset)
  clear() {
    this.index = {};
    this.applications.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
