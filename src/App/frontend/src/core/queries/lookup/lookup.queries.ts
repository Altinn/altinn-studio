import { queryOptions } from '@tanstack/react-query';

import type { AppQueries } from 'src/core/queries/types';

export const personLookupQuery = (ssn: string, name: string, api: Pick<AppQueries, 'fetchPerson'>) =>
  queryOptions({
    queryKey: [{ scope: 'personLookup', ssn, name }],
    queryFn: () => api.fetchPerson(ssn, name),
    enabled: false,
    gcTime: 0,
  });

export const organizationLookupQuery = (orgNr: string, api: Pick<AppQueries, 'fetchOrg'>) =>
  queryOptions({
    queryKey: [{ scope: 'organizationLookup', orgNr }],
    queryFn: () => api.fetchOrg(orgNr),
    enabled: false,
    gcTime: 0,
  });
