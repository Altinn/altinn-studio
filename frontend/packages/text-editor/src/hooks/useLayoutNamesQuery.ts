import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { removeExtension } from 'app-shared/utils/filenameUtils';

export const useLayoutNamesQuery = (owner, app): UseQueryResult<string[]> => {
  const { getLayoutNames } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.LayoutNames, owner, app],
    queryFn: () =>
      getLayoutNames(owner, app).then((layoutNames) =>
        layoutNames.map((layoutName) => removeExtension(layoutName)),
      ),
  });
};
