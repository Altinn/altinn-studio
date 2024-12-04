import { Ajv, type JSONSchemaType } from 'ajv';
import adderrors from 'ajv-errors';

import type {
  Organisation,
  OrganisationLookupResponse,
} from 'src/layout/OrganisationLookup/OrganisationLookupComponent';

const ajv = new Ajv({ allErrors: true });
adderrors(ajv);

ajv.addKeyword({
  keyword: 'isValidOrgNr',
  type: 'string',
  validate: (_, data: string) => {
    if (typeof data !== 'string') {
      return false;
    }

    return checkValidOrgnNr(data);
  },
});

const orgNrSchema: JSONSchemaType<Pick<Organisation, 'orgNr'>> = {
  type: 'object',
  properties: {
    orgNr: {
      type: 'string',
      isValidOrgNr: true,
      errorMessage: 'organisation_lookup.validation_error_orgnr',
    },
  },
  required: ['orgNr'],
};

export function checkValidOrgnNr(orgNr: string): boolean {
  if (orgNr.length !== 9) {
    return false;
  }
  const [a1, a2, a3, a4, a5, a6, a7, a8, a9] = orgNr.split('').map(Number);
  const allegedCheckDigit = a9;

  const [w1, w2, w3, w4, w5, w6, w7, w8] = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = a1 * w1 + a2 * w2 + a3 * w3 + a4 * w4 + a5 * w5 + a6 * w6 + a7 * w7 + a8 * w8;
  const calculatedCheckDigit = 11 - (sum % 11);

  return calculatedCheckDigit === allegedCheckDigit;
}

export const validateOrgnr = ajv.compile(orgNrSchema);

const organisationLookupResponseSchema: JSONSchemaType<OrganisationLookupResponse> = {
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

export const validateOrganisationLookupResponse = ajv.compile(organisationLookupResponseSchema);
