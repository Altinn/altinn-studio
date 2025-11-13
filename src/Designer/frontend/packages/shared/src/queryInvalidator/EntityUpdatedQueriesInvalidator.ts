import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { Queue } from 'app-shared/queue/Queue';

/**
 * Singleton class used to invalidate queries when specific entities are updated.
 * It extends the Queue class to ensure that queries are invalidated only once per entity update.
 * @class EntityUpdatedQueriesInvalidator
 * @extends Queue
 * @param {QueryClient} queryClient - The QueryClient instance used for query invalidation.
 * @param {string} org - The organization ID associated with the queries.
 * @param {string} app - The application ID associated with the queries.
 * @returns {EntityUpdatedQueriesInvalidator} - An instance of the EntityUpdatedQueriesInvalidator class.
 */
export class EntityUpdatedQueriesInvalidator extends Queue {
  private static instance: EntityUpdatedQueriesInvalidator | null = null;
  private _org: string;
  private readonly _app: string;
  private _queryClient: QueryClient;

  // A map of entity resource names to their associated cache keys for invalidation upon entity updates.
  // This can be extended to include additional entities and their respective cache keys.
  private readonly entityNameCacheKeysMap: Record<string, Array<Array<QueryKey | string>>> = {
    Deployment: [[QueryKey.AppDeployments, '[org]', '[app]']],
    Alert: [[QueryKey.Alerts, '[org]']],
  };

  constructor(queryClient: QueryClient, org: string, app: string) {
    super({ timeout: 500 });
    this._org = org;
    this._app = app;
    this._queryClient = queryClient;
  }

  /**
   * Singleton method to retrieve or create an instance of EntityUpdatedQueriesInvalidator.
   * Ensures that only one instance exists for a given queryClient, org, and app combination.
   * @param {QueryClient} queryClient - The QueryClient instance for query invalidation.
   * @param {string} org - The organization ID for the queries.
   * @param {string} app - The application ID for the queries.
   * @returns {EntityUpdatedQueriesInvalidator} - The singleton instance of the EntityUpdatedQueriesInvalidator class.
   */
  public static getInstance(
    queryClient: QueryClient,
    org: string,
    app: string,
  ): EntityUpdatedQueriesInvalidator {
    const shouldCreateNewInstance = !EntityUpdatedQueriesInvalidator.instance;

    if (shouldCreateNewInstance) {
      EntityUpdatedQueriesInvalidator.instance = new EntityUpdatedQueriesInvalidator(
        queryClient,
        org,
        app,
      );
    }

    return EntityUpdatedQueriesInvalidator.instance;
  }

  /**
   * Resets the singleton instance of EntityUpdatedQueriesInvalidator.
   */
  public static resetInstance(): void {
    EntityUpdatedQueriesInvalidator.instance = null;
  }

  /**
   * Invalidates queries associated with a specific resource name.
   * This will trigger invalidation for all relevant queries related to the resource.
   * @param {string} resourceName - The name of the resource (e.g., 'Deployment') whose related queries should be invalidated.
   */
  public invalidateQueriesByResourceName(resourceName: string): void {
    const cacheKeys = this.getCacheKeysByResourceName(resourceName);
    if (!cacheKeys) return;

    // Adds the query invalidation task to the queue for processing.
    this.addTaskToQueue({
      id: resourceName,
      callback: () => {
        cacheKeys.forEach((cacheKey) => {
          this._queryClient.invalidateQueries({ queryKey: cacheKey });
        });
      },
    });
  }

  /**
   * Retrieves the cache keys for a given resource name (entity).
   * @param {string} resourceName - The resource name (e.g., 'Deployment') whose cache keys need to be retrieved.
   * @returns {Array<string[]> | undefined} - The cache keys for the resource, or undefined if no matching keys are found.
   */
  private getCacheKeysByResourceName(resourceName: string): Array<string[]> {
    const cacheKeys = this.entityNameCacheKeysMap[resourceName];
    if (!cacheKeys) return undefined;

    return this.replaceCacheKeysPlaceholders(cacheKeys);
  }

  /**
   * Replaces placeholders in the cache keys with actual values for the organization and application.
   * @param {Array<string[]>} cacheKeys - The cache keys with placeholders to be replaced.
   * @returns {Array<string[]>} - The cache keys with placeholders replaced by the organization and application values.
   */
  private replaceCacheKeysPlaceholders(cacheKeys: Array<string[]>): Array<string[]> {
    return cacheKeys.map((cacheKey) =>
      cacheKey.map((key) => key.replace('[org]', this._org).replace('[app]', this._app)),
    );
  }
}
