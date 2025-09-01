import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type BelongsToOrg = {
  belongsToOrg: boolean;
};

export const useFetchBelongsToOrgQuery = (): UseQueryResult<BelongsToOrg> => {
  const { fetchBelongsToGiteaOrg } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.BelongsToOrg],
    queryFn: () => fetchBelongsToGiteaOrg(),
  });
};
