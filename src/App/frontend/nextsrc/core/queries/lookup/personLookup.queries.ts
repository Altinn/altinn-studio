import { queryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { LookupApi } from 'nextsrc/core/api-client/lookupApi';
import { ServerStatusCodes } from 'nextsrc/core/serverStatusCodes';
import type { PersonDetails } from 'nextsrc/core/api-client/lookupApi';

export type PersonLookupResult = { person: PersonDetails; error: null } | { person: null; error: string };

export const personLookupQueries = {
  lookup: (ssn: string, name: string) =>
    queryOptions({
      queryKey: [{ scope: 'personLookup', ssn, name }],
      queryFn: async (): Promise<PersonLookupResult> => {
        try {
          const response = await LookupApi.lookupPerson(ssn, name);
          if (!response.success || !response.personDetails) {
            return { person: null, error: 'person_lookup.validation_error_not_found' };
          }
          return { person: response.personDetails, error: null };
        } catch (error) {
          if (error instanceof AxiosError) {
            if (error.response?.status === ServerStatusCodes.Forbidden) {
              return { person: null, error: 'person_lookup.validation_error_forbidden' };
            }
            if (error.response?.status === ServerStatusCodes.TooManyRequests) {
              return { person: null, error: 'person_lookup.validation_error_too_many_requests' };
            }
          }
          return { person: null, error: 'person_lookup.unknown_error' };
        }
      },
      enabled: false,
      gcTime: 0,
    }),
};
