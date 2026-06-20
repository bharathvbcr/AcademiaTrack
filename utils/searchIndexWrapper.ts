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
  private latestApplications: Application[] = [];
  private initPromise: Promise<void> | null = null;
  private destroyed = false;

  constructor() {
    this.fallback = new ApplicationSearchIndex();
    this.initPromise = this.initWorker();
  }

  private async initWorker() {
    try {
      if (typeof Worker !== 'undefined') {
        const workerInstance = new ApplicationSearchIndexWorker();
        try {
          await workerInstance.getStats();
          if (this.destroyed) {
            workerInstance.destroy();
            return;
          }
          if (this.latestApplications.length > 0) {
            await workerInstance.rebuild(this.latestApplications);
          }
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
    this.latestApplications = [
      ...this.latestApplications.filter(existing => existing.id !== app.id),
      app,
    ];
    if (this.useWorker && this.worker) {
      return this.worker.indexApplication(app);
    }
    this.fallback.indexApplication(app);
  }

  async indexApplicationsBatch(apps: Application[]): Promise<void> {
    const nextById = new Map(this.latestApplications.map(app => [app.id, app]));
    apps.forEach(app => nextById.set(app.id, app));
    this.latestApplications = Array.from(nextById.values());
    if (this.useWorker && this.worker) {
      return this.worker.indexApplicationsBatch(apps);
    }
    this.fallback.indexApplicationsBatch(apps);
  }

  async removeApplication(id: string): Promise<void> {
    this.latestApplications = this.latestApplications.filter(app => app.id !== id);
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
    this.latestApplications = applications;
    if (this.useWorker && this.worker) {
      return this.worker.rebuild(applications);
    }
    this.fallback.rebuild(applications);
  }

  async updateApplications(applications: Application[]): Promise<void> {
    this.latestApplications = applications;
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
    this.destroyed = true;
    this.worker?.destroy();
    this.worker = null;
  }
}
