import { useQuery } from '@tanstack/react-query';

import { organizationLookupQuery, personLookupQuery } from 'src/core/queries/lookup/lookup.queries';
import type { LookupFailure, LookupResult, Organization, Person } from 'src/core/queries/lookup/types';

export type { LookupFailure, Organization, Person };

export function usePersonLookup(ssn: string, lastName: string) {
  const query = useQuery(personLookupQuery(ssn, lastName));
  return {
    isFetching: query.isFetching,
    lookup: async (): Promise<LookupResult<Person>> =>
      (await query.refetch()).data ?? { data: null, failure: 'unknown' },
  };
}

export function useOrganizationLookup(orgNr: string) {
  const query = useQuery(organizationLookupQuery(orgNr));
  return {
    isFetching: query.isFetching,
    lookup: async (): Promise<LookupResult<Organization>> =>
      (await query.refetch()).data ?? { data: null, failure: 'unknown' },
  };
}
