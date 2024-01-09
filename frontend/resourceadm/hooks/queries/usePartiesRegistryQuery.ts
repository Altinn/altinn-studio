import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { BrregOrganizationResult } from 'app-shared/types/ResourceAdm';
import { AxiosError } from 'axios';
import { getPartiesQueryUrl } from 'resourceadm/utils/urlUtils';

export const usePartiesRegistryQuery = (
  navn: string,
): UseQueryResult<BrregOrganizationResult, AxiosError> => {
  const { getParties } = useServicesContext();

  return useQuery<BrregOrganizationResult, AxiosError>({
    queryKey: [QueryKey.PartiesRegistrySearch, navn],
    queryFn: () => getParties(getPartiesQueryUrl(navn)),
    enabled: !!navn,
  });
};
