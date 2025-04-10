import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import { useOrgListQuery } from './useOrgListQuery';

export const useGetAvailableCodeListsFromOrgQuery = (
  org: string,
  contentType: LibraryContentType,
): UseQueryResult<string[], Error> => {
  const { getAvailbleResourcesFromOrg } = useServicesContext();

  const { data: orgs, isPending: orgsPending } = useOrgListQuery();

  const isValidOrg: boolean = orgs && !orgsPending && Object.keys(orgs).includes(org);

  return useQuery<string[]>({
    queryKey: [QueryKey.CodeListTitles, org, contentType],
    enabled: isValidOrg,
    queryFn: () => {
      if (!isValidOrg) {
        return null;
      }
      return getAvailbleResourcesFromOrg(org, contentType);
    },
  });
};
