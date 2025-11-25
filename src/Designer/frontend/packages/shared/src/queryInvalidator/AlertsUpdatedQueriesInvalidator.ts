import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { Queue } from 'app-shared/queue/Queue';

export class AlertsUpdatedQueriesInvalidator extends Queue {
  private static instance: AlertsUpdatedQueriesInvalidator | null = null;
  private _org: string;
  private _queryClient: QueryClient;

  constructor(queryClient: QueryClient, org: string) {
    super({ timeout: 500 });
    this._org = org;
    this._queryClient = queryClient;
  }

  public static getInstance(
    queryClient: QueryClient,
    org: string,
  ): AlertsUpdatedQueriesInvalidator {
    const shouldCreateNewInstance = !AlertsUpdatedQueriesInvalidator.instance;

    if (shouldCreateNewInstance) {
      AlertsUpdatedQueriesInvalidator.instance = new AlertsUpdatedQueriesInvalidator(
        queryClient,
        org,
      );
    }

    return AlertsUpdatedQueriesInvalidator.instance;
  }

  public invalidateQueries(environment: string): void {
    const queryKey = [QueryKey.Alerts, this._org, environment];
    this.addTaskToQueue({
      id: queryKey.join('-'),
      callback: () => {
        this._queryClient.invalidateQueries({
          queryKey,
        });
      },
    });
  }
}
