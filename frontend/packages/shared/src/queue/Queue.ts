import type { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';

type QueueOptions = {
  timeout?: number;
};

export class Queue {
  private queue: string[] = [];
  private queueTimeoutId: number | null = null;
  private readonly options: QueueOptions | undefined;

  constructor(options?: { timeout?: number }) {
    this.options = options;
    this.startProcessingQueue();
  }

  public addCacheKeyToQueue(cacheKey: QueryKey): void {
    if (this.queue.includes(cacheKey)) return;

    this.queue.push(cacheKey);
    this.resetTimeOutQueue();
  }

  private resetTimeOutQueue() {
    this.queueTimeoutId = null;
  }

  private startProcessingQueue() {
    this.queueTimeoutId = setTimeout(() => {
      this.queue.forEach((cacheKey) => {
        this.options.QueryClient.invalidateQueries(cacheKey);
        // queryClient.invalid(cacheKey);
      });
    }, this.options?.timeout || 1000);
  }
}
