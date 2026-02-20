import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CustomTemplate } from 'app-shared/types/CustomTemplate';

export const useAvailableTemplatesForUserQuery = (
  username?: string,
  options?: { enabled: boolean },
): UseQueryResult<CustomTemplate[]> => {
  const { getAvailableTemplates } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CustomTemplates, username],
    queryFn: () => getAvailableTemplates().then((data) => data.templates),
    ...options,
  });
};
