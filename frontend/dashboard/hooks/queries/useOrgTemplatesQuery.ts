import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { OrgTemplate } from 'app-shared/types/OrgTemplates';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useOrgTemplatesQuery = (org: string): UseQueryResult<OrgTemplate[]> => {
  const { getOrgTemplates } = useServicesContext();
  return useQuery<OrgTemplate[]>({
    queryKey: [QueryKey.OrgTemplates, org],
    queryFn: () => getOrgTemplates(org),
  });
};
