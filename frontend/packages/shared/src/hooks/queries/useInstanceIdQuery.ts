import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useInstanceIdQuery = (org: string, app: string): UseQueryResult<string> => {
  const { getInstanceIdForPreview } = useServicesContext();
  return useQuery({
    queryKey: [(QueryKey.InstanceId, org, app)],
    queryFn: () => getInstanceIdForPreview(org, app),
  });
};
