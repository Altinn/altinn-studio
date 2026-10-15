import { useQuery } from '@tanstack/react-query';

import { organizationLookupQuery, personLookupQuery } from 'src/core/queries/lookup/lookup.queries';
import type { Organization, OrganizationLookupResult, Person, PersonLookupResult } from 'src/core/queries/lookup/types';

export type { Organization, Person };

export function usePersonLookup(ssn: string, name: string) {
  const query = useQuery(personLookupQuery(ssn, name));
  return {
    error: query.data?.error,
    isFetching: query.isFetching,
    lookup: async (): Promise<PersonLookupResult> =>
      (await query.refetch()).data ?? { person: null, error: 'person_lookup.unknown_error' },
  };
}

export function useOrganizationLookup(orgNr: string) {
  const query = useQuery(organizationLookupQuery(orgNr));
  return {
    error: query.data?.error,
    isFetching: query.isFetching,
    lookup: async (): Promise<OrganizationLookupResult> =>
      (await query.refetch()).data ?? { org: null, error: 'organization_lookup.unknown_error' },
  };
}
