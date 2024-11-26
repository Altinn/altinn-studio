import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

export const useGetSelectedScopesQuery = () => {
  const { getSelectedMaskinportenScopes } = useServicesContext();
  return useQuery<MaskinportenScope[]>({
    queryKey: [QueryKey.SelectedAppScopes],
    queryFn: () => getSelectedMaskinportenScopes(),
  });
};
