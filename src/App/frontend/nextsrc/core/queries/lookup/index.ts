import { useQuery } from '@tanstack/react-query';
import { orgLookupQueries } from 'nextsrc/core/queries/lookup/organisationLookup.queries';
import { personLookupQueries } from 'nextsrc/core/queries/lookup/personLookup.queries';
import type { OrganisationDetails, PersonDetails } from 'nextsrc/core/api-client/lookupApi';

interface UsePersonLookupResult {
  person: PersonDetails | null;
  error: string | null;
  performLookup: () => Promise<{ person: PersonDetails | null; error: string | null }>;
  isFetching: boolean;
}

export function usePersonLookup(ssn: string, name: string): UsePersonLookupResult {
  const { data, refetch, isFetching } = useQuery(personLookupQueries.lookup(ssn, name));
  return {
    person: data?.person ?? null,
    error: data?.error ?? null,
    performLookup: async () => {
      const { data } = await refetch();
      return { person: data?.person ?? null, error: data?.error ?? null };
    },
    isFetching,
  };
}

interface UseOrganisationLookupResult {
  org: OrganisationDetails | null;
  error: string | null;
  performLookup: () => Promise<{ org: OrganisationDetails | null; error: string | null }>;
  isFetching: boolean;
}

export function useOrganisationLookup(orgNr: string): UseOrganisationLookupResult {
  const { data, refetch, isFetching } = useQuery(orgLookupQueries.lookup(orgNr));
  return {
    org: data?.org ?? null,
    error: data?.error ?? null,
    performLookup: async () => {
      const { data } = await refetch();
      return { org: data?.org ?? null, error: data?.error ?? null };
    },
    isFetching,
  };
}
