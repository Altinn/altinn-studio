import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IValidationOnNavigationLayoutSettings } from 'app-shared/types/global';

export const useValidationOnNavigationGroupedSettingsQuery = (
  org: string,
  app: string,
): UseQueryResult<IValidationOnNavigationLayoutSettings[]> => {
  const { getValidationOnNavigationLayoutSettings } = useServicesContext();
  return useQuery<IValidationOnNavigationLayoutSettings[]>({
    queryKey: [QueryKey.ValidationOnNavigationLayoutSettings, org, app],
    queryFn: () => getValidationOnNavigationLayoutSettings(org, app),
  });
};
