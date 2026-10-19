import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AssistantCostOrg } from 'app-shared/types/api';

export const useAssistantCostOrgsQuery = (enabled: boolean): UseQueryResult<AssistantCostOrg[]> => {
  const { getAssistantCostOrgs } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.AssistantCostOrgs],
    queryFn: () => getAssistantCostOrgs(),
    enabled,
  });
};
