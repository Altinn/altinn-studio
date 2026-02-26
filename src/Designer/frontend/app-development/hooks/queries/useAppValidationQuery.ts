import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

export type AppValidationResult = {
  isValid: boolean;
  errors: Map<string, string[]>;
};

export const useAppValidationQuery = (
  org: string,
  app: string,
): UseQueryResult<AppValidationResult> => {
  const { getAppValidation } = useServicesContext();

  return useQuery<any>({
    staleTime: 1000 * 30,
    queryKey: [QueryKey.AppValidation, org, app],
    queryFn: () =>
      getAppValidation(org, app).then((response) => {
        return response;
      }),
  });
};
