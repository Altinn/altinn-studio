import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';
import type { ValidationOnNavigation } from 'app-shared/types/global';

export const useValidationOnNavigationQuery = (
  org: string,
  app: string,
  level: ValidationOnNavigationLevel = ValidationOnNavigationLevel.Global,
): UseQueryResult<ValidationOnNavigation> => {
  const { getValidationOnNavigation } = useServicesContext();

  return useQuery<ValidationOnNavigation>({
    queryKey: [QueryKey.ValidationOnNavigation, org, app, level],
    queryFn: () => getValidationOnNavigation(org, app, level),
  });
};
