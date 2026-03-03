import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IValidationOnNavigationPageSettings } from 'app-shared/types/global';

export const useValidationOnNavigationPageSettingsQuery = (
  org: string,
  app: string,
): UseQueryResult<IValidationOnNavigationPageSettings[]> => {
  const { getValidationOnNavigationPageSettings } = useServicesContext();
  return useQuery<IValidationOnNavigationPageSettings[]>({
    queryKey: [QueryKey.ValidationOnNavigationPageSettings, org, app],
    queryFn: () => getValidationOnNavigationPageSettings(org, app),
  });
};
