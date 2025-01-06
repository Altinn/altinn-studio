import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { fetchRoles } from 'src/queries/queries';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { Role } from 'src/types/shared';

export type RoleResult = { data: Role[] | undefined; error: Error | null };

export function useCurrentPartyRolesQueryDef(enabled: boolean): UseQueryOptions<Role[], Error> {
  return {
    queryKey: ['fetchCurrentPartyRoles'],
    queryFn: fetchRoles,
    staleTime: 1000 * 60 * 10,
    enabled,
  };
}

export function appSupportsRolesAPI({ altinnNugetVersion }: ApplicationMetadata) {
  return !altinnNugetVersion || isAtLeastVersion({ actualVersion: altinnNugetVersion, minimumVersion: '8.5.0.165' });
}

export const useCurrentPartyRoles = (): RoleResult => {
  const applicationMetadata = useApplicationMetadata();
  const supportsRolesAPI = appSupportsRolesAPI(applicationMetadata);
  const query = useQuery(useCurrentPartyRolesQueryDef(supportsRolesAPI));

  return { data: query.data, error: query.error };
};
