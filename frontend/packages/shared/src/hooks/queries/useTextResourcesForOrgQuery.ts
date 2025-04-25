import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../contexts/ServicesContext';
import { type ITextResourcesWithLanguage } from '../../types/global';

export const useTextResourcesForOrgQuery = (
  orgName: string,
  language: string,
): UseQueryResult<ITextResourcesWithLanguage | null> => {
  const { getTextResourcesForOrg } = useServicesContext();
  return useQuery<ITextResourcesWithLanguage | null>({
    queryKey: [QueryKey.TextResourcesForOrg, orgName, language],
    queryFn: () => getTextResourcesForOrg(orgName, language),
  });
};
