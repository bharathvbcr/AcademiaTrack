import { Application } from '../types';
import { ApplicationSearchIndex } from './searchIndex';
import { ApplicationSearchIndexWorker, IndexStats } from './searchIndexWorker';

export interface SearchIndexInterface {
  indexApplication(app: Application): void | Promise<void>;
  indexApplicationsBatch(apps: Application[]): void | Promise<void>;
  removeApplication(id: string): void | Promise<void>;
  search(query: string): Application[] | Promise<Application[]>;
  rebuild(applications: Application[]): void | Promise<void>;
  updateApplications(applications: Application[]): void | Promise<void>;
  getStats(): IndexStats | Promise<IndexStats>;
  clear(): void | Promise<void>;
}

/**
 * Wrapper that uses Web Worker when available, falls back to synchronous implementation
 */
export class ApplicationSearchIndexWrapper implements SearchIndexInterface {
  private worker: ApplicationSearchIndexWorker | null = null;
  private fallback: ApplicationSearchIndex;
  private useWorker: boolean = false;

  constructor() {
    this.fallback = new ApplicationSearchIndex();
    this.initWorker();
  }

  private async initWorker() {
    try {
      // Check if workers are supported
      if (typeof Worker !== 'undefined') {
        // Try to create worker (may fail in some environments)
        const workerInstance = new ApplicationSearchIndexWorker();
        // Test if worker works by getting stats
        try {
          await workerInstance.getStats();
          this.worker = workerInstance;
          this.useWorker = true;
          console.log('Search index using Web Worker for better performance');
        } catch (error) {
          console.warn('Web Worker not available, using fallback:', error);
          workerInstance.destroy();
        }
      }
    } catch (error) {
      console.warn('Failed to initialize Web Worker, using fallback:', error);
    }
  }

  async indexApplication(app: Application): Promise<void> {
    if (this.useWorker && this.worker) {
      return this.worker.indexApplication(app);
    }
    this.fallback.indexApplication(app);
  }

  async indexApplicationsBatch(apps: Application[]): Promise<void> {
    if (this.useWorker && this.worker) {
      return this.worker.indexApplicationsBatch(apps);
    }
    this.fallback.indexApplicationsBatch(apps);
  }

  async removeApplication(id: string): Promise<void> {
    if (this.useWorker && this.worker) {
      return this.worker.removeApplication(id);
    }
    this.fallback.removeApplication(id);
  }

  async search(query: string): Promise<Application[]> {
    if (this.useWorker && this.worker) {
      return this.worker.search(query);
    }
    return this.fallback.search(query);
  }

  async rebuild(applications: Application[]): Promise<void> {
    if (this.useWorker && this.worker) {
      return this.worker.rebuild(applications);
    }
    this.fallback.rebuild(applications);
  }

  async updateApplications(applications: Application[]): Promise<void> {
    if (this.useWorker && this.worker) {
      return this.worker.updateApplications(applications);
    }
    this.fallback.updateApplications(applications);
  }

  async getStats(): Promise<IndexStats> {
    if (this.useWorker && this.worker) {
      return this.worker.getStats();
    }
    return this.fallback.getStats();
  }

  async clear(): Promise<void> {
    if (this.useWorker && this.worker) {
      return this.worker.clear();
    }
    this.fallback.clear();
  }

  destroy() {
    if (this.worker) {
      this.worker.destroy();
    }
  }
}
