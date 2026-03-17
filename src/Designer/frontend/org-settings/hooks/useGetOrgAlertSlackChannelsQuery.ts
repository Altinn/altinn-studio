import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertSlackChannel } from 'app-shared/types/OrgAlertContactPoint';

export const useGetOrgAlertSlackChannelsQuery = (
  org: string,
): UseQueryResult<OrgAlertSlackChannel[]> => {
  const { getOrgAlertSlackChannels } = useServicesContext();
  return useQuery<OrgAlertSlackChannel[]>({
    queryKey: [QueryKey.OrgAlertSlackChannels, org],
    queryFn: () => getOrgAlertSlackChannels(org),
  });
};
