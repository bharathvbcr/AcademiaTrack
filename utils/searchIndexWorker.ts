import { Application } from '../types';
import { WorkerMessage, WorkerResponse } from './searchIndex.worker';

export interface IndexStats {
  indexedApplications: number;
  indexTerms: number;
  totalIndexEntries: number;
  lastUpdated: number;
  health: 'healthy' | 'degraded' | 'needs_rebuild';
}

export class ApplicationSearchIndexWorker {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }> = new Map();
  private requestIdCounter = 0;
  private initialized = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Create worker from the worker file
      this.worker = new Worker(
        new URL('./searchIndex.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        const { type, payload, id } = event.data;
        
        if (id && this.pendingRequests.has(id)) {
          const { resolve, reject } = this.pendingRequests.get(id)!;
          this.pendingRequests.delete(id);
          
          if (type === 'error') {
            reject(new Error(payload?.message || 'Unknown error'));
          } else {
            resolve(payload);
          }
        }
      });

      this.worker.addEventListener('error', (error) => {
        console.error('Search index worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize search index worker:', error);
      // Fallback: worker not available, operations will fail gracefully
      this.initialized = false;
    }
  }

  private sendMessage<T>(type: WorkerMessage['type'], payload?: any): Promise<T> {
    if (!this.initialized || !this.worker) {
      return Promise.reject(new Error('Search index worker not initialized'));
    }

    const id = `req_${++this.requestIdCounter}_${Date.now()}`;
    
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Search index operation timed out'));
        }
      }, 10000);

      this.worker!.postMessage({ type, payload, id } as WorkerMessage);
    });
  }

  async indexApplication(app: Application): Promise<void> {
    return this.sendMessage('index', app);
  }

  async indexApplicationsBatch(apps: Application[]): Promise<void> {
    return this.sendMessage('indexBatch', apps);
  }

  async removeApplication(id: string): Promise<void> {
    return this.sendMessage('remove', id);
  }

  async search(query: string): Promise<Application[]> {
    return this.sendMessage<Application[]>('search', query);
  }

  async rebuild(applications: Application[]): Promise<void> {
    return this.sendMessage('rebuild', applications);
  }

  async updateApplications(applications: Application[]): Promise<void> {
    return this.sendMessage('update', applications);
  }

  async getStats(): Promise<IndexStats> {
    return this.sendMessage<IndexStats>('getStats');
  }

  async clear(): Promise<void> {
    return this.sendMessage('clear');
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.initialized = false;
  }
}
