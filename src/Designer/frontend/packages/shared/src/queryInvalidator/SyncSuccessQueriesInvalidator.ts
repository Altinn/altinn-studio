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
  private readonly fileNameCacheKeysMap: Record<string, Array<Array<QueryKey | string>>> = {
    'applicationmetadata.json': [[QueryKey.AppMetadata, '[org]', '[app]']],
    'layout-sets.json': [
      [QueryKey.LayoutSets, '[org]', '[app]'],
      [QueryKey.LayoutSetsExtended, '[org]', '[app]'],
    ],
    'policy.xml': [[QueryKey.AppPolicy, '[org]', '[app]']],
    'Settings.json': [[QueryKey.FormLayoutSettings, '[org]', '[app]', '[layoutSetName]']],
  };

  // Maps folder names to their cache keys for invalidation upon sync success - can be extended to include more folders
  private readonly folderNameCacheKeysMap: Record<string, Array<Array<QueryKey | string>>> = {
    layouts: [
      [QueryKey.FormLayouts, '[org]', '[app]'],
      [QueryKey.Pages, '[org]', '[app]', '[layoutSetName]'],
    ],
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

  public invalidateQueriesByFileLocation(fileOrFolderName: string): void {
    const cacheKeys = this.getCacheKeysByFileLocation(fileOrFolderName);
    if (!cacheKeys) return;

    this.addTaskToQueue({
      id: fileOrFolderName,
      callback: () => {
        cacheKeys.forEach((cacheKey) => {
          this._queryClient.invalidateQueries({ queryKey: cacheKey });
        });
      },
    });
  }

  private getCacheKeysByFileLocation(fileOrFolderName: string): Array<string[]> {
    const cacheKeys =
      this.fileNameCacheKeysMap[fileOrFolderName] || this.folderNameCacheKeysMap[fileOrFolderName];
    if (!cacheKeys) return undefined;

    return this.replaceCacheKeysPlaceholders(cacheKeys);
  }

  private replaceCacheKeysPlaceholders(cacheKeys: Array<string[]>): Array<string[]> {
    return cacheKeys.map((cacheKey) =>
      cacheKey.map((key) =>
        key
          .replace('[org]', this._org)
          .replace('[app]', this._app)
          .replace('[layoutSetName]', this._layoutSetName),
      ),
    );
  }
}
