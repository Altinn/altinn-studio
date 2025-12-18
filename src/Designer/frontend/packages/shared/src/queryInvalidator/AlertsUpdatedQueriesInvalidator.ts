import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import { Queue } from 'app-shared/queue/Queue';

export class AlertsUpdatedQueriesInvalidator extends Queue {
  private static instance: AlertsUpdatedQueriesInvalidator | null = null;
  private _org: string;
  private _queryClient: QueryClient;

  constructor(queryClient: QueryClient, org: string, timeout: number = 500) {
    super({ timeout });
    this._org = org;
    this._queryClient = queryClient;
  }

  public static getInstance(
    queryClient: QueryClient,
    org: string,
    timeout?: number,
  ): AlertsUpdatedQueriesInvalidator {
    const shouldCreateNewInstance = !AlertsUpdatedQueriesInvalidator.instance;

    if (shouldCreateNewInstance) {
      AlertsUpdatedQueriesInvalidator.instance = new AlertsUpdatedQueriesInvalidator(
        queryClient,
        org,
        timeout,
      );
    }

    return AlertsUpdatedQueriesInvalidator.instance;
  }

  public invalidateQueries(environment: string): void {
    const queryKeys = [
      [QueryKey.ErrorMetrics, this._org, environment],
      [QueryKey.AppErrorMetrics, this._org, environment],
    ];
    this.addTaskToQueue({
      id: queryKeys.join(','),
      callback: () => {
        queryKeys.forEach((queryKey) =>
          this._queryClient.invalidateQueries({
            queryKey,
          }),
        );
      },
    });
  }
}
