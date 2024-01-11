import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { BrregPartySearchResult } from 'app-shared/types/ResourceAdm';
import { AxiosError } from 'axios';
import { getPartiesQueryUrl } from 'resourceadm/utils/urlUtils';

export const usePartiesRegistryQuery = (
  navn: string,
): UseQueryResult<BrregPartySearchResult, AxiosError> => {
  const { getParties } = useServicesContext();

  return useQuery<BrregPartySearchResult, AxiosError>({
    queryKey: [QueryKey.PartiesRegistrySearch, navn],
    queryFn: () => getParties(getPartiesQueryUrl(navn)),
    enabled: !!navn,
  });
};
