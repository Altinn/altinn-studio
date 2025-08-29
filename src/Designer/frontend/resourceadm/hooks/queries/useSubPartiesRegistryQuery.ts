import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  BrregSearchResult,
  BrregSubPartySearchResult,
  ResourceError,
} from 'app-shared/types/ResourceAdm';

export const useSubPartiesRegistryQuery = (searchUrl: string) => {
  const { getSubParties } = useServicesContext();

  return useQuery<BrregSubPartySearchResult, ResourceError, BrregSearchResult>({
    queryKey: [QueryKey.SubPartiesRegistrySearch, searchUrl],
    queryFn: () => getSubParties(searchUrl),
    select: (data): BrregSearchResult => {
      return {
        parties: (data._embedded?.underenheter ?? []).map((party) => {
          return {
            orgNr: party.organisasjonsnummer,
            orgName: party.navn,
            isSubParty: true,
          };
        }),
        links: data._links,
        page: data.page,
      };
    },
    enabled: !!searchUrl,
    placeholderData: keepPreviousData,
  });
};
