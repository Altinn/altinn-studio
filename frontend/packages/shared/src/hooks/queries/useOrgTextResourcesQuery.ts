import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../contexts/ServicesContext';
import { type ITextResourcesWithLanguage } from '../../types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export const useOrgTextResourcesQuery = (
  orgName: string,
  language: string,
): UseQueryResult<ITextResourcesWithLanguage> => {
  const { getOrgTextResources } = useServicesContext();
  return useQuery<ITextResourcesWithLanguage>({
    queryKey: [QueryKey.OrgTextResources, orgName, language],
    queryFn: (): Promise<ITextResourcesWithLanguage | null> =>
      getOrgTextResources(orgName, language),
    select,
  });
};

function select(data: ITextResourcesWithLanguage | null): ITextResourcesWithLanguage {
  return data || defaultTextResources;
}

const defaultTextResources: ITextResourcesWithLanguage = {
  language: DEFAULT_LANGUAGE,
  resources: [],
};
