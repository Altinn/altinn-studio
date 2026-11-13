import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UserPlatformPermission } from 'app-shared/types/UserPlatformPermission';

export const useUserPlatformPermissionsQuery = (): UseQueryResult<UserPlatformPermission> => {
  const { getUserPlatformPermissions } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.UserPlatformPermissions],
    queryFn: getUserPlatformPermissions,
  });
};
