import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { Queue } from 'app-shared/queue/Queue';

export class SyncSuccessQueriesInvalidator extends Queue {
  private org: string;
  private app: string;
  private queryClient: QueryClient;

  private readonly fileNameCacheKeyMap: Record<string, Array<QueryKey | string>> = {
    'applicationmetadata.json': [QueryKey.AppMetadata, '[org]', '[app]'],
    'layout-sets.json': [QueryKey.LayoutSets, '[org]', '[app]'],
    'policy.xml': [QueryKey.AppPolicy, '[org]', '[app]'],
  };

  constructor(queryClient: QueryClient, org: string, app: string) {
    super({ timeout: 5000 });
    this.org = org;
    this.app = app;
    this.queryClient = queryClient;
  }

  public invalidateQueryByFileName(fileName: string): void {
    this.addTaskToQueue({
      id: fileName,
      callback: () => {
        const cacheKey = this.getCacheKeyByFileName(fileName);
        this.queryClient.invalidateQueries({ queryKey: cacheKey });
      },
    });
  }

  private getCacheKeyByFileName(fileName: string): string[] {
    const cacheKey = this.fileNameCacheKeyMap[fileName];
    console.log({ cacheKey });
    if (cacheKey.includes('[org]') || cacheKey.includes('[app]')) {
      return cacheKey.map((key) => key.replace('[org]', this.org).replace('[app]', this.app));
    }
    return cacheKey;
  }
}
