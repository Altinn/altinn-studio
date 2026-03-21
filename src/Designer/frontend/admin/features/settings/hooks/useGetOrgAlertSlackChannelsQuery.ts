import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetOrgAlertSlackChannelsQuery = (org: string) => {
  const { getOrgAlertSlackChannels } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.OrgAlertSlackChannels, org],
    queryFn: () => getOrgAlertSlackChannels(org),
  });
};
