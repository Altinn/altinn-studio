import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IValidationOnNavigationLayoutSets } from 'app-shared/types/global';

export const useGlobalValidationOnNavigationQuery = (
  org: string,
  app: string,
): UseQueryResult<IValidationOnNavigationLayoutSets> => {
  const { getGlobalValidationOnNavigation } = useServicesContext();
  return useQuery<IValidationOnNavigationLayoutSets>({
    queryKey: [QueryKey.ValidationOnNavigationLayoutSets, org, app],
    queryFn: () => getGlobalValidationOnNavigation(org, app),
  });
};
