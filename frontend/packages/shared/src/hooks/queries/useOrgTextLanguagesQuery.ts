import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../contexts/ServicesContext';

export const useOrgTextLanguagesQuery = (orgName: string): UseQueryResult<string[]> => {
  const { getOrgTextLanguages } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.OrgTextLanguages, orgName],
    queryFn: (): Promise<string[] | null> => getOrgTextLanguages(orgName),
  });
};
