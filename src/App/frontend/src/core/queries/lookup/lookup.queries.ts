import { queryOptions } from '@tanstack/react-query';
import { Ajv, type JSONSchemaType } from 'ajv';
import { isAxiosError } from 'axios';

import { httpGet, httpPost } from 'src/utils/network/networking';
import { appPath } from 'src/utils/urls/appUrlHelper';
import type {
  LookupResult,
  Organization,
  OrganizationLookupResponse,
  Person,
  PersonLookupResponse,
} from 'src/core/queries/lookup/types';

const ajv = new Ajv({ allErrors: true });

const personLookupResponseSchema: JSONSchemaType<PersonLookupResponse> = {
  type: 'object',
  oneOf: [
    {
      properties: {
        success: { const: false },
        personDetails: { type: 'null' },
      },
      required: ['success', 'personDetails'],
    },
    {
      properties: {
        success: { const: true },
        personDetails: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            ssn: { type: 'string' },
          },
          required: ['name', 'ssn'],
          additionalProperties: true,
        },
      },
      required: ['success', 'personDetails'],
    },
  ],
  required: ['success', 'personDetails'],
};

const validatePersonLookupResponse = ajv.compile(personLookupResponseSchema);

const organizationLookupResponseSchema: JSONSchemaType<OrganizationLookupResponse> = {
  type: 'object',
  oneOf: [
    {
      properties: {
        success: { const: false },
        organisationDetails: { type: 'null' },
      },
      required: ['success', 'organisationDetails'],
    },
    {
      properties: {
        success: { const: true },
        organisationDetails: {
          type: 'object',
          properties: {
            orgNr: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['orgNr', 'name'],
        },
      },
      required: ['success', 'organisationDetails'],
    },
  ],
  required: ['success', 'organisationDetails'],
};

const validateOrganizationLookupResponse = ajv.compile(organizationLookupResponseSchema);

async function fetchPerson(ssn: string, lastName: string): Promise<LookupResult<Person>> {
  try {
    const response = await httpPost(`${appPath}/api/v1/lookup/person`, undefined, {
      socialSecurityNumber: ssn,
      lastName,
    });
    if (!validatePersonLookupResponse(response.data)) {
      return { data: null, failure: 'invalidResponse' };
    }
    return response.data.success ? { data: response.data.personDetails } : { data: null, failure: 'notFound' };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      return { data: null, failure: 'forbidden' };
    }
    if (isAxiosError(error) && error.response?.status === 429) {
      return { data: null, failure: 'tooManyRequests' };
    }
    return { data: null, failure: 'unknown' };
  }
}

async function fetchOrganization(orgNr: string): Promise<LookupResult<Organization>> {
  try {
    const response = await httpGet(`${appPath}/api/v1/lookup/organisation/${orgNr}`);
    if (!validateOrganizationLookupResponse(response)) {
      return { data: null, failure: 'invalidResponse' };
    }
    return response.success ? { data: response.organisationDetails } : { data: null, failure: 'notFound' };
  } catch {
    return { data: null, failure: 'unknown' };
  }
}

export const personLookupQuery = (ssn: string, lastName: string) =>
  queryOptions({
    queryKey: [{ scope: 'personLookup', appPath, ssn, lastName }],
    queryFn: () => fetchPerson(ssn, lastName),
    enabled: false,
    gcTime: 0,
  });

export const organizationLookupQuery = (orgNr: string) =>
  queryOptions({
    queryKey: [{ scope: 'organizationLookup', appPath, orgNr }],
    queryFn: () => fetchOrganization(orgNr),
    enabled: false,
    gcTime: 0,
  });
