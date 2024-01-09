import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { BrregUnderOrganizationResult } from 'app-shared/types/ResourceAdm';
import { AxiosError } from 'axios';
import { getPartiesQueryUrl } from 'resourceadm/utils/urlUtils';

export const useSubPartiesRegistryQuery = (
  navn: string,
): UseQueryResult<BrregUnderOrganizationResult, AxiosError> => {
  const { getSubParties } = useServicesContext();

  return useQuery<BrregUnderOrganizationResult, AxiosError>({
    queryKey: [QueryKey.SubPartiesRegistrySearch, navn],
    queryFn: () => getSubParties(getPartiesQueryUrl(navn, true)),
    enabled: !!navn,
  });
};
