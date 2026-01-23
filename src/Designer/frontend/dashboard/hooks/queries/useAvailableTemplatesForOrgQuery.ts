import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';

export const useAvailableTemplatesForOrgQuery = (
  org?: string,
  options?: { enabled: boolean },
): UseQueryResult<CustomTemplate[]> => {
  const { getAvailableTemplatesForOrg } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CustomTemplates, org],
    queryFn: () => getAvailableTemplatesForOrg(org).then((data) => data.templates),
    ...options,
  });
};
