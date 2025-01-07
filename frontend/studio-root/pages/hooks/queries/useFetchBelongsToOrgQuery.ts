import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useFetchBelongsToOrgQuery = () => {
  const { fetchBelongsToGiteaOrg } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.BelongsToOrg],
    queryFn: () => fetchBelongsToGiteaOrg(),
  });
};
