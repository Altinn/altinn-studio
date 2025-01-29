import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type ITextResourcesWithLanguage } from 'app-shared/types/global';

export const useTextResourcesForOrgQuery = (
  org: string,
  language: string,
): UseQueryResult<ITextResourcesWithLanguage> => {
  const { getTextResourcesForOrg } = useServicesContext();
  return useQuery<ITextResourcesWithLanguage>({
    queryKey: [QueryKey.TextResourcesForOrg],
    queryFn: () => getTextResourcesForOrg(org, language),
  });
};
