import { useQuery } from '@tanstack/react-query';
import { orgLookupQueries } from 'nextsrc/core/queries/lookup/organisationLookup.queries';
import { personLookupQueries } from 'nextsrc/core/queries/lookup/personLookup.queries';
import type { OrganisationDetails, PersonDetails } from 'nextsrc/core/api-client/lookupApi';

type PersonLookupResult = { person: PersonDetails | null; error: string | null };

interface UsePersonLookupResult extends PersonLookupResult {
  performLookup: () => Promise<PersonLookupResult>;
  isFetching: boolean;
}

export function usePersonLookup(ssn: string, name: string): UsePersonLookupResult {
  const { data, refetch, isFetching } = useQuery(personLookupQueries.lookup(ssn, name));
  return {
    person: data?.person ?? null,
    error: data?.error ?? null,
    performLookup: async () => {
      const { data, error: refetchError } = await refetch();
      if (refetchError) {
        return { person: null, error: refetchError.message };
      }
      return { person: data?.person ?? null, error: data?.error ?? null };
    },
    isFetching,
  };
}

type OrganisationLookupResult = { org: OrganisationDetails | null; error: string | null };

interface UseOrganisationLookupResult extends OrganisationLookupResult {
  performLookup: () => Promise<OrganisationLookupResult>;
  isFetching: boolean;
}

export function useOrganisationLookup(orgNr: string): UseOrganisationLookupResult {
  const { data, refetch, isFetching } = useQuery(orgLookupQueries.lookup(orgNr));
  return {
    org: data?.org ?? null,
    error: data?.error ?? null,
    performLookup: async () => {
      const { data, error: refetchError } = await refetch();
      if (refetchError) {
        return { org: null, error: refetchError.message };
      }
      return { org: data?.org ?? null, error: data?.error ?? null };
    },
    isFetching,
  };
}
