import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { Queue } from 'app-shared/queue/Queue';

class SyncSuccessQueriesInvalidator extends Queue {
  private org: string;
  private app: string;

  private readonly fileNameCacheKeyMap: Record<string, Array<QueryKey | string>> = {
    'applicationmetadata.json': [QueryKey.AppMetadata, '[org]', '[app]'],
    'layout-sets.json': [QueryKey.LayoutSets, '[org]', '[app]'],
    'policy.xml': [QueryKey.AppPolicy, '[org]', '[app]'],
  };

  constructor(queryClient: QueryClient, org: string, app: string) {
    super();
    this.org = org;
    this.app = app;
  }

  public invalidateQueryByFileName(fileName: string): void {
    this.addCacheKeyToQueue(this.getCacheKeyByFileName(fileName));
  }

  private getCacheKeyByFileName(fileName: string): QueryKey[] {
    const cacheKey = this.fileNameCacheKeyMap[fileName];

    if (cacheKey.includes('[org]') || cacheKey.includes('[app]')) {
      return cacheKey.map((key) =>
        key.replace('[org]', this.org).replace('[app]', this.app),
      ) as QueryKey[];
    }

    return cacheKey as QueryKey[];
  }
}
