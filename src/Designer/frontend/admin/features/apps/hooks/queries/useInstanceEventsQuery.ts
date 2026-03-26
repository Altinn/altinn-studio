import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { instanceEventsPath } from 'admin/features/apps/utils/apiPaths';
import type { InstanceEvent } from 'admin/features/apps/types/InstanceEvent';

export const useInstanceEventsQuery = (
  org: string,
  env: string,
  app: string,
  instanceId: string,
): UseQueryResult<InstanceEvent[]> => {
  return useQuery<InstanceEvent[]>({
    queryKey: [QueryKey.InstanceEvents, org, env, app, instanceId],
    queryFn: async ({ signal }) =>
      (
        await axios.get<InstanceEvent[]>(instanceEventsPath(org, env, app, instanceId), {
          signal,
        })
      ).data,
  });
};
