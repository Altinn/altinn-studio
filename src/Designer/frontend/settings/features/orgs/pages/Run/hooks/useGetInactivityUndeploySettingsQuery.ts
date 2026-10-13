import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetInactivityUndeploySettingsQuery = (org: string) => {
  const { getOrgInactivityUndeploySettings } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.OrgInactivityUndeploySettings, org],
    queryFn: () => getOrgInactivityUndeploySettings(org),
  });
};
