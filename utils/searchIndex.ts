import { Application } from '../types';

export interface SearchIndex {
  [key: string]: Set<string>; // term -> set of application IDs
}

export class ApplicationSearchIndex {
  private index: SearchIndex = {};
  private applications: Map<string, Application> = new Map();

  indexApplication(app: Application) {
    this.applications.set(app.id, app);
    this.removeFromIndex(app.id);
    this.addToIndex(app);
  }

  removeApplication(id: string) {
    this.removeFromIndex(id);
    this.applications.delete(id);
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
    applications.forEach(app => this.indexApplication(app));
  }

  getStats() {
    return {
      indexedApplications: this.applications.size,
      indexTerms: Object.keys(this.index).length,
      totalIndexEntries: Object.values(this.index).reduce((sum, set) => sum + set.size, 0),
    };
  }
}
