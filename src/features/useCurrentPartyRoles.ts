import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { fetchRoles } from 'src/queries/queries';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { Role } from 'src/types/shared';

export type RoleResult = { data: Role[] | undefined; error: Error | null };

export function useCurrentPartyRolesQueryDef(
  supportsRolesAPI: boolean,
  partyID?: string,
  instanceGUID?: string,
): UseQueryOptions<Role[], Error> {
  const enabled = !!(supportsRolesAPI && partyID && instanceGUID);

  return {
    queryKey: ['fetchCurrentPartyRoles', partyID, instanceGUID],
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
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const query = useQuery(useCurrentPartyRolesQueryDef(supportsRolesAPI, instanceOwnerPartyId, instanceGuid));

  return { data: query.data, error: query.error };
};
