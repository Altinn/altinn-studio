import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { Queue } from 'app-shared/queue/Queue';

/**
 * This class is a singleton and should be used to invalidate queries when specific files are successfully synced/updated.
 * It extends the Queue class to ensure that the queries are only invalidated once for each file.
 * @class SyncSuccessQueriesInvalidator
 * @extends Queue
 * @param {QueryClient} queryClient - The query client instance
 * @param {string} org - The organization id
 * @param {string} app - The application id
 * @returns {SyncSuccessQueriesInvalidator} - An instance of the SyncSuccessQueriesInvalidator class
 */

export class SyncSuccessQueriesInvalidator extends Queue {
  private static instance: SyncSuccessQueriesInvalidator | null = null;
  private org: string;
  private app: string;
  private queryClient: QueryClient;

  // Maps file names to their cache keys for invalidation upon sync success - can be extended to include more files
  private readonly fileNameCacheKeyMap: Record<string, Array<QueryKey | string>> = {
    'applicationmetadata.json': [QueryKey.AppMetadata, '[org]', '[app]'],
    'layout-sets.json': [QueryKey.LayoutSets, '[org]', '[app]'],
    'policy.xml': [QueryKey.AppPolicy, '[org]', '[app]'],
  };

  constructor(queryClient: QueryClient, org: string, app: string) {
    super({ timeout: 500 });
    this.org = org;
    this.app = app;
    this.queryClient = queryClient;
  }

  // Singleton pattern to ensure only one instance of the StudioBpmnModeler is created
  public static getInstance(
    queryClient: QueryClient,
    org: string,
    app: string,
  ): SyncSuccessQueriesInvalidator {
    const shouldCreateNewInstance = !SyncSuccessQueriesInvalidator.instance;

    if (shouldCreateNewInstance) {
      SyncSuccessQueriesInvalidator.instance = new SyncSuccessQueriesInvalidator(
        queryClient,
        org,
        app,
      );
    }

    return SyncSuccessQueriesInvalidator.instance;
  }

  public invalidateQueryByFileName(fileName: string): void {
    const cacheKey = this.getCacheKeyByFileName(fileName);
    if (!cacheKey) return;

    this.addTaskToQueue({
      id: fileName,
      callback: () => {
        this.queryClient.invalidateQueries({ queryKey: cacheKey });
      },
    });
  }

  private getCacheKeyByFileName(fileName: string): string[] {
    const cacheKey = this.fileNameCacheKeyMap[fileName];
    if (!cacheKey) return undefined;

    return cacheKey.map((key) => key.replace('[org]', this.org).replace('[app]', this.app));
  }
}
