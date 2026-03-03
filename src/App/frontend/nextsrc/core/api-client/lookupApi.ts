import { axiosInstance } from 'nextsrc/core/axiosInstance';

export interface OrganisationDetails {
  orgNr: string;
  name: string;
}

export interface OrganisationLookupResponse {
  success: boolean;
  organisationDetails: OrganisationDetails | null;
}

export interface PersonDetails {
  firstName: string;
  lastName: string;
  middleName: string;
  ssn: string;
}

export interface PersonLookupResponse {
  success: boolean;
  personDetails: PersonDetails | null;
}

export class LookupApi {
  public static async lookupOrganisation(orgNr: string): Promise<OrganisationLookupResponse> {
    const { data } = await axiosInstance.get<OrganisationLookupResponse>(
      `/api/v1/lookup/organisation/${orgNr}`,
    );
    return data;
  }

  public static async lookupPerson(
    ssn: string,
    lastName: string,
  ): Promise<PersonLookupResponse> {
    const { data } = await axiosInstance.post<PersonLookupResponse>('/api/v1/lookup/person', {
      socialSecurityNumber: ssn,
      lastName,
    });
    return data;
  }
}
