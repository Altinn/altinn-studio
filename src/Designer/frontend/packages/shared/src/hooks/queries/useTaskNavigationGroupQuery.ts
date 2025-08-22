import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { TaskNavigationGroup } from '../../types/api/dto/TaskNavigationGroup';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useTaskNavigationGroupQuery = (
  org: string,
  app: string,
): UseQueryResult<TaskNavigationGroup[], Error> => {
  const { getTaskNavigationGroup } = useServicesContext();
  return useQuery<TaskNavigationGroup[]>({
    queryKey: [QueryKey.TaskNavigationGroup, org, app],
    queryFn: () => getTaskNavigationGroup(org, app),
  });
};
