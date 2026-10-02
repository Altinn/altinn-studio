export type Person = {
  ssn: string;
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
};

export type Organization = { orgNr: string; name: string };

export type PersonLookupResponse = { success: false; personDetails: null } | { success: true; personDetails: Person };
export type OrganizationLookupResponse =
  { success: false; organisationDetails: null } | { success: true; organisationDetails: Organization };

export type LookupFailure = 'notFound' | 'invalidResponse' | 'forbidden' | 'tooManyRequests' | 'unknown';
export type LookupResult<T> = { data: T; failure?: never } | { data: null; failure: LookupFailure };
