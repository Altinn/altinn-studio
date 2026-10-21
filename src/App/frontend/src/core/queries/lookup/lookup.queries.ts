import { queryOptions } from '@tanstack/react-query';
import { Ajv, type JSONSchemaType } from 'ajv';
import { isAxiosError } from 'axios';

import { httpGet, httpPost } from 'src/utils/network/networking';
import { appPath } from 'src/utils/urls/appUrlHelper';
import type {
  OrganizationLookupResponse,
  OrganizationLookupResult,
  PersonLookupResponse,
  PersonLookupResult,
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

async function fetchPerson(ssn: string, name: string): Promise<PersonLookupResult> {
  if (!ssn || !name) {
    throw new Error('Missing ssn or name');
  }
  const body = { socialSecurityNumber: ssn, lastName: name };
  const url = `${appPath}/api/v1/lookup/person`;

  try {
    const response = await httpPost(url, undefined, body);
    const data = response.data;

    if (!validatePersonLookupResponse(data)) {
      return { person: null, error: 'person_lookup.validation_invalid_response_from_server' };
    }

    if (!data.success) {
      return { person: null, error: 'person_lookup.validation_error_not_found' };
    }

    return { person: data.personDetails, error: null };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      return { person: null, error: 'person_lookup.validation_error_forbidden' };
    }
    if (isAxiosError(error) && error.response?.status === 429) {
      return { person: null, error: 'person_lookup.validation_error_too_many_requests' };
    }

    return { person: null, error: 'person_lookup.unknown_error' };
  }
}

async function fetchOrg(orgNr: string): Promise<OrganizationLookupResult> {
  if (!orgNr) {
    throw new Error('orgNr is required');
  }
  const url = `${appPath}/api/v1/lookup/organisation/${orgNr}`;

  try {
    const response = await httpGet(url);

    if (!validateOrganizationLookupResponse(response)) {
      return { org: null, error: 'organization_lookup.validation_invalid_response_from_server' };
    }

    if (!response.success || !response.organisationDetails) {
      return { org: null, error: 'organization_lookup.validation_error_not_found' };
    }

    return { org: response.organisationDetails, error: null };
  } catch {
    return { org: null, error: 'organization_lookup.unknown_error' };
  }
}

export const personLookupQuery = (ssn: string, name: string) =>
  queryOptions({
    queryKey: [{ scope: 'personLookup', ssn, name }],
    queryFn: () => fetchPerson(ssn, name),
    enabled: false,
    gcTime: 0,
  });

export const organizationLookupQuery = (orgNr: string) =>
  queryOptions({
    queryKey: [{ scope: 'organizationLookup', orgNr }],
    queryFn: () => fetchOrg(orgNr),
    enabled: false,
    gcTime: 0,
  });
