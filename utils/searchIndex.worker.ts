import { Application } from '../types';

export interface SearchIndex {
  [key: string]: Set<string>; // term -> set of application IDs
}

export interface WorkerMessage {
  type: 'index' | 'indexBatch' | 'remove' | 'search' | 'rebuild' | 'update' | 'getStats' | 'clear';
  payload?: any;
  id?: string; // For request/response matching
}

export interface WorkerResponse {
  type: 'indexed' | 'removed' | 'searchResults' | 'stats' | 'cleared' | 'error';
  payload?: any;
  id?: string;
}

// Worker state
let index: SearchIndex = {};
let applications: Map<string, Application> = new Map();

function tokenize(text: string): string[] {
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

function extractTerms(app: Application): string[] {
  const terms: string[] = [];
  
  // University name
  tokenize(app.universityName).forEach(term => terms.push(term));
  
  // Program name
  tokenize(app.programName).forEach(term => terms.push(term));
  
  // Department
  if (app.department) {
    tokenize(app.department).forEach(term => terms.push(term));
  }
  
  // Location
  if (app.location) {
    tokenize(app.location).forEach(term => terms.push(term));
  }
  
  // Notes
  if (app.notes) {
    tokenize(app.notes).forEach(term => terms.push(term));
  }
  
  // Faculty contacts
  app.facultyContacts?.forEach(faculty => {
    tokenize(faculty.name).forEach(term => terms.push(term));
    if (faculty.researchArea) {
      tokenize(faculty.researchArea).forEach(term => terms.push(term));
    }
  });
  
  // Tags
  app.tags?.forEach(tag => {
    tokenize(tag).forEach(term => terms.push(term));
  });
  
  return terms;
}

function addToIndex(app: Application) {
  const terms = extractTerms(app);
  terms.forEach(term => {
    if (!index[term]) {
      index[term] = new Set();
    }
    index[term].add(app.id);
  });
}

function removeFromIndex(id: string) {
  Object.keys(index).forEach(term => {
    index[term].delete(id);
    if (index[term].size === 0) {
      delete index[term];
    }
  });
}

function search(query: string): Application[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return Array.from(applications.values());
  }

  const matchingIds = new Map<string, number>(); // ID -> score
  
  queryTerms.forEach(term => {
    Object.keys(index).forEach(indexedTerm => {
      if (indexedTerm.includes(term) || term.includes(indexedTerm)) {
        index[indexedTerm].forEach(id => {
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
    .map(id => applications.get(id))
    .filter((app): app is Application => app !== undefined);
}

function hasApplicationChanged(oldApp: Application, newApp: Application): boolean {
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

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = event.data;
  
  try {
    switch (type) {
      case 'index': {
        const app = payload as Application;
        applications.set(app.id, app);
        removeFromIndex(app.id);
        addToIndex(app);
        self.postMessage({ type: 'indexed', id } as WorkerResponse);
        break;
      }
      
      case 'indexBatch': {
        const apps = payload as Application[];
        apps.forEach(app => {
          applications.set(app.id, app);
          removeFromIndex(app.id);
          addToIndex(app);
        });
        self.postMessage({ type: 'indexed', id, payload: { count: apps.length } } as WorkerResponse);
        break;
      }
      
      case 'remove': {
        const appId = payload as string;
        removeFromIndex(appId);
        applications.delete(appId);
        self.postMessage({ type: 'removed', id } as WorkerResponse);
        break;
      }
      
      case 'search': {
        const query = payload as string;
        const results = search(query);
        self.postMessage({ type: 'searchResults', id, payload: results } as WorkerResponse);
        break;
      }
      
      case 'rebuild': {
        const apps = payload as Application[];
        index = {};
        applications.clear();
        apps.forEach(app => {
          applications.set(app.id, app);
          addToIndex(app);
        });
        self.postMessage({ type: 'indexed', id, payload: { count: apps.length } } as WorkerResponse);
        break;
      }
      
      case 'update': {
        const apps = payload as Application[];
        const currentIds = new Set(applications.keys());
        const newIds = new Set(apps.map(app => app.id));
        
        // Find added/updated applications
        const toAddOrUpdate: Application[] = [];
        apps.forEach(app => {
          if (!applications.has(app.id)) {
            toAddOrUpdate.push(app);
          } else {
            const existing = applications.get(app.id);
            if (existing && hasApplicationChanged(existing, app)) {
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
        
        // Process changes
        toRemove.forEach(id => {
          removeFromIndex(id);
          applications.delete(id);
        });
        
        toAddOrUpdate.forEach(app => {
          applications.set(app.id, app);
          removeFromIndex(app.id);
          addToIndex(app);
        });
        
        // If too many changes, rebuild
        const changeRatio = (toAddOrUpdate.length + toRemove.length) / Math.max(apps.length, 1);
        if (changeRatio > 0.5) {
          index = {};
          applications.clear();
          apps.forEach(app => {
            applications.set(app.id, app);
            addToIndex(app);
          });
        }
        
        self.postMessage({ type: 'indexed', id, payload: { updated: toAddOrUpdate.length, removed: toRemove.length } } as WorkerResponse);
        break;
      }
      
      case 'getStats': {
        const indexedApplications = applications.size;
        const indexTerms = Object.keys(index).length;
        const totalIndexEntries = Object.values(index).reduce((sum, set) => sum + set.size, 0);
        
        let health: 'healthy' | 'degraded' | 'needs_rebuild' = 'healthy';
        if (indexedApplications === 0 && indexTerms === 0) {
          health = 'needs_rebuild';
        } else if (indexTerms === 0 || totalIndexEntries === 0) {
          health = 'degraded';
        }
        
        self.postMessage({
          type: 'stats',
          id,
          payload: {
            indexedApplications,
            indexTerms,
            totalIndexEntries,
            lastUpdated: Date.now(),
            health,
          },
        } as WorkerResponse);
        break;
      }
      
      case 'clear': {
        index = {};
        applications.clear();
        self.postMessage({ type: 'cleared', id } as WorkerResponse);
        break;
      }
      
      default:
        self.postMessage({ type: 'error', id, payload: { message: `Unknown message type: ${type}` } } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, payload: { message: error instanceof Error ? error.message : 'Unknown error' } } as WorkerResponse);
  }
});
