import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useProcessTasksQuery = (org: string, app: string): UseQueryResult<string[]> => {
  const { getProcessTasks } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.ProcessTaskDataType, org, app],
    queryFn: () => getProcessTasks(org, app),
  });
};
