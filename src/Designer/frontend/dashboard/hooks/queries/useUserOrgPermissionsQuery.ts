import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

type UserOrgPermission = {
  canCreateOrgRepo: boolean;
};

export const useUserOrgPermissionQuery = (
  org: string,
  options?: { enabled: boolean },
): UseQueryResult<UserOrgPermission> => {
  const { getUserOrgPermissions } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.UserOrgPermissions, org],
    queryFn: () => getUserOrgPermissions(org),
    ...options,
  });
};
