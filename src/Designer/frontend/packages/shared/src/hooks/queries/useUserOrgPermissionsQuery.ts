import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

type UserOrgPermissions = {
  canCreateOrgRepo: boolean;
  isOrgOwner: boolean;
};

export const useUserOrgPermissionsQuery = (
  org: string,
  options?: { enabled: boolean },
): UseQueryResult<UserOrgPermissions> => {
  const { getUserOrgPermissions } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.UserOrgPermissions, org],
    queryFn: () => getUserOrgPermissions(org),
    ...options,
  });
};
