import { useQuery } from '@tanstack/react-query';
import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useProcessTaskTypeQuery = (
  org: string,
  app: string,
  taskId: string,
  meta?: QueryMeta,
): UseQueryResult<string> => {
  const { getProcessTaskType } = useServicesContext();
  return useQuery<string>({
    queryKey: [QueryKey.ProcessTaskDataType, org, app, taskId],
    queryFn: () => getProcessTaskType(org, app, taskId),
    meta,
  });
};
