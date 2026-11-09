import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PublishedApplicationStatus } from 'admin/features/apps/types/PublishedApplicationStatus';
import { appStatusesPath } from 'admin/features/apps/utils/apiPaths';

/** A deploy or a restart changes an app's status within minutes, so the list reads it again every minute. */
const APP_STATUSES_REFETCH_INTERVAL_MS = 60_000;

/** How each app published to the environment runs, keyed by app. */
export const usePublishedAppStatusesQuery = (
  org: string,
  env: string,
): UseQueryResult<Map<string, PublishedApplicationStatus>> =>
  useQuery({
    queryKey: [QueryKey.PublishedAppStatuses, org, env],
    queryFn: async ({ signal }) =>
      (await axios.get<PublishedApplicationStatus[]>(appStatusesPath(org, env), { signal })).data,
    select: (statuses) => new Map(statuses.map((status) => [status.app, status])),
    refetchInterval: APP_STATUSES_REFETCH_INTERVAL_MS,
    // A column that cannot be filled shows a dash; the list itself still works.
    meta: { hideDefaultError: true },
  });
