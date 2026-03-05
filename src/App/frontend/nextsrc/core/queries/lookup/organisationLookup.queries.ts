import { queryOptions } from '@tanstack/react-query';
import { LookupApi } from 'nextsrc/core/api-client/lookupApi';
import type { OrganisationDetails } from 'nextsrc/core/api-client/lookupApi';

export type OrgLookupResult = { org: OrganisationDetails; error: null } | { org: null; error: string };

export const orgLookupQueries = {
  lookup: (orgNr: string) =>
    queryOptions({
      queryKey: [{ scope: 'organisationLookup', orgNr }],
      queryFn: async (): Promise<OrgLookupResult> => {
        try {
          const response = await LookupApi.lookupOrganisation(orgNr);
          if (!response.success || !response.organisationDetails) {
            return { org: null, error: 'organisation_lookup.validation_error_not_found' };
          }
          return { org: response.organisationDetails, error: null };
        } catch {
          return { org: null, error: 'organisation_lookup.unknown_error' };
        }
      },
      enabled: false,
      gcTime: 0,
    }),
};
