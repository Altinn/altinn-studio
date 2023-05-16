import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../common/ServiceContext';

export const useInstanceIdQuery = (org: string, app: string): UseQueryResult<string> => {
  const { getInstanceIdForPreview } = useServicesContext();
  return useQuery(
    [QueryKey.InstanceId, org, app],
    () => getInstanceIdForPreview(org, app)
  );
};
