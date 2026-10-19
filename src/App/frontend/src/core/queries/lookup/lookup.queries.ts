import { queryOptions } from '@tanstack/react-query';

import type { LookupApi } from 'src/core/api-client/lookup.api';

export const personLookupQuery = (ssn: string, name: string, api: LookupApi) =>
  queryOptions({
    queryKey: [{ scope: 'personLookup', ssn, name }],
    queryFn: () => api.fetchPerson(ssn, name),
    enabled: false,
    gcTime: 0,
  });

export const organizationLookupQuery = (orgNr: string, api: LookupApi) =>
  queryOptions({
    queryKey: [{ scope: 'organizationLookup', orgNr }],
    queryFn: () => api.fetchOrg(orgNr),
    enabled: false,
    gcTime: 0,
  });
