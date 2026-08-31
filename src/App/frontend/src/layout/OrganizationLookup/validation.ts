import { Ajv, type JSONSchemaType } from 'ajv';
import adderrors from 'ajv-errors';

import type {
  Organization,
  OrganizationLookupResponse,
} from 'src/layout/OrganizationLookup/OrganizationLookupComponent';

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

const orgNrSchema: JSONSchemaType<Pick<Organization, 'orgNr'>> = {
  type: 'object',
  properties: {
    orgNr: {
      type: 'string',
      isValidOrgNr: true,
      errorMessage: 'organization_lookup.validation_error_orgnr',
    },
  },
  required: ['orgNr'],
};

export function checkValidOrgnNr(orgNr: string): boolean {
  if (orgNr.length !== 9 || !/^\d{9}$/.test(orgNr)) {
    return false;
  }
  const orgnr_digits = orgNr.split('').map(Number);
  const k1 = orgnr_digits.at(-1)!;

  const weights = [3, 2, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += orgnr_digits[i] * weights[i];
  }

  let calculated_k1 = modularAdditiveInverse(sum, 11);
  calculated_k1 = calculated_k1 % 11;

  return calculated_k1 === k1;
}

export const validateOrgnr = ajv.compile(orgNrSchema);

const modularAdditiveInverse = (value: number, base: number): number => base - (value % base);

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

export const validateOrganizationLookupResponse = ajv.compile(organizationLookupResponseSchema);
