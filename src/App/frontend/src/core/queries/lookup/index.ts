import { useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';
import { organizationLookupQuery, personLookupQuery } from 'src/core/queries/lookup/lookup.queries';
import type {
  Organization,
  OrganizationLookupResult,
  Person,
  PersonLookupResult,
} from 'src/core/api-client/lookup.types';

export type { Organization, Person };

export function usePersonLookup(ssn: string, name: string) {
  const api = useAppQueries();
  const query = useQuery(personLookupQuery(ssn, name, api));
  const { refetch } = query;
  const lookup = useCallback(
    async (): Promise<PersonLookupResult> =>
      (await refetch()).data ?? { person: null, error: 'person_lookup.unknown_error' },
    [refetch],
  );
  return {
    error: query.data?.error,
    isFetching: query.isFetching,
    lookup,
  };
}

export function useOrganizationLookup(orgNr: string) {
  const api = useAppQueries();
  const query = useQuery(organizationLookupQuery(orgNr, api));
  const { refetch } = query;
  const lookup = useCallback(
    async (): Promise<OrganizationLookupResult> =>
      (await refetch()).data ?? { org: null, error: 'organization_lookup.unknown_error' },
    [refetch],
  );
  return {
    error: query.data?.error,
    isFetching: query.isFetching,
    lookup,
  };
}
