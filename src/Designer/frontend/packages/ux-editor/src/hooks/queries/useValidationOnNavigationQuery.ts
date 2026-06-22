import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';
import type { ValidationOnNavigationByLevel } from 'app-shared/types/global';

export const useValidationOnNavigationQuery = <
  T extends ValidationOnNavigationLevel = ValidationOnNavigationLevel.Global,
>(
  org: string,
  app: string,
  level: T = ValidationOnNavigationLevel.Global as T,
) => {
  const { getValidationOnNavigation } = useServicesContext();

  return useQuery<ValidationOnNavigationByLevel[T]>({
    queryKey: [QueryKey.ValidationOnNavigation, org, app, level],
    queryFn: () => getValidationOnNavigation(org, app, level),
  });
};
