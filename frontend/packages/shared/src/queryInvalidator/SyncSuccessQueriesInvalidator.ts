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
  private _org: string;
  private _app: string;
  private _layoutSetName?: string;
  private _queryClient: QueryClient;

  // Maps file names to their cache keys for invalidation upon sync success - can be extended to include more files
  private readonly fileNameCacheKeyMap: Record<string, Array<QueryKey | string>> = {
    'applicationmetadata.json': [QueryKey.AppMetadata, '[org]', '[app]'],
    'layout-sets.json': [QueryKey.LayoutSets, '[org]', '[app]'],
    'policy.xml': [QueryKey.AppPolicy, '[org]', '[app]'],
    'Settings.json': [QueryKey.FormLayoutSettings, '[org]', '[app]', '[layoutSetName]'],
    'resource.nb.json': [QueryKey.TextResources, '[org]', '[app]', '[layoutSetName]'],
  };

  // Maps folder names to their cache keys for invalidation upon sync success - can be extended to include more folders
  private readonly folderNameCacheKeyMap: Record<string, Array<QueryKey | string>> = {
    layouts: [QueryKey.FormLayouts, '[org]', '[app]', '[layoutSetName]'],
  };

  public set layoutSetName(layoutSetName: string) {
    this._layoutSetName = layoutSetName;
  }

  constructor(queryClient: QueryClient, org: string, app: string) {
    super({ timeout: 500 });
    this._org = org;
    this._app = app;
    this._queryClient = queryClient;
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

  public static resetInstance(): void {
    SyncSuccessQueriesInvalidator.instance = null;
  }

  public invalidateQueryByFileLocation(fileOrFolderName: string): void {
    const cacheKey = this.getCacheKeyByFileLocation(fileOrFolderName);
    if (!cacheKey) return;

    this.addTaskToQueue({
      id: fileOrFolderName,
      callback: () => {
        this._queryClient.invalidateQueries({ queryKey: cacheKey });
      },
    });
  }

  private getCacheKeyByFileLocation(fileOrFolderName: string): string[] {
    const cacheKey =
      this.fileNameCacheKeyMap[fileOrFolderName] || this.folderNameCacheKeyMap[fileOrFolderName];
    if (!cacheKey) return undefined;

    return this.replaceCacheKeyPlaceholders(cacheKey);
  }

  private replaceCacheKeyPlaceholders(cacheKey: string[]): string[] {
    return cacheKey.map((key) =>
      key
        .replace('[org]', this._org)
        .replace('[app]', this._app)
        .replace('[layoutSetName]', this._layoutSetName),
    );
  }
}
