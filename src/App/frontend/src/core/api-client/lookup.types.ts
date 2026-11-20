export type Person = {
  firstName: string;
  lastName: string;
  middleName: string;
  ssn: string;
};

export type Organization = { orgNr: string; name: string };

export type PersonLookupResponse = { success: false; personDetails: null } | { success: true; personDetails: Person };
export type OrganizationLookupResponse =
  { success: false; organisationDetails: null } | { success: true; organisationDetails: Organization };

export type PersonLookupResult = { person: Person; error: null } | { person: null; error: string };
export type OrganizationLookupResult = { org: Organization; error: null } | { org: null; error: string };
