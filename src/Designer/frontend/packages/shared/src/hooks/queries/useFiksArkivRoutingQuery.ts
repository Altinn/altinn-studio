import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

export function useFiksArkivRoutingQuery(org: string, app: string) {
  const { getFiksArkivRouting } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.FiksArkivRouting, org, app],
    queryFn: () => getFiksArkivRouting(org, app),
  });
}
