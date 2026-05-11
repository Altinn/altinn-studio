import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IValidationOnNavigationLayoutSets } from 'app-shared/types/global';

export const useValidationOnNavigationLayoutSetsQuery = (
  org: string,
  app: string,
): UseQueryResult<IValidationOnNavigationLayoutSets> => {
  const { getValidationOnNavigationLayoutSets } = useServicesContext();
  return useQuery<IValidationOnNavigationLayoutSets>({
    queryKey: [QueryKey.ValidationOnNavigationLayoutSets, org, app],
    queryFn: () => getValidationOnNavigationLayoutSets(org, app),
  });
};
