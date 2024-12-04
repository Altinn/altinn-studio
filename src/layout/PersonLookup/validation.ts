import { Ajv, type JSONSchemaType } from 'ajv';
import addErrors from 'ajv-errors';

import type { Person, PersonLookupResponse } from 'src/layout/PersonLookup/PersonLookupComponent';

const ajv = new Ajv({ allErrors: true });
addErrors(ajv);

ajv.addKeyword({
  keyword: 'isValidSsn',
  type: 'string',
  validate: (_, data: string) => {
    if (typeof data !== 'string') {
      return false;
    }

    return checkValidSsn(data);
  },
});

const ssnSchema: JSONSchemaType<Pick<Person, 'ssn'>> = {
  type: 'object',
  properties: {
    ssn: {
      type: 'string',
      isValidSsn: true,
      errorMessage: 'person_lookup.validation_error_ssn',
    },
  },
  required: ['ssn'],
};

export function checkValidSsn(ssn: string): boolean {
  if (ssn.length !== 11) {
    return false;
  }
  const [d1, d2, m1, m2, y1, y2, i1, i2, i3, k1, k2] = ssn.split('').map(Number);
  const calculated_k1 = 11 - ((3 * d1 + 7 * d2 + 6 * m1 + 1 * m2 + 8 * y1 + 9 * y2 + 4 * i1 + 5 * i2 + 2 * i3) % 11);
  const calculated_k2 =
    11 - ((5 * d1 + 4 * d2 + 3 * m1 + 2 * m2 + 7 * y1 + 6 * y2 + 5 * i1 + 4 * i2 + 3 * i3 + 2 * calculated_k1) % 11);

  return k1 === calculated_k1 && k2 === calculated_k2;
}

const nameSchema: JSONSchemaType<Pick<Person, 'name'>> = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2, errorMessage: 'person_lookup.validation_error_name_too_short' },
  },
  required: ['name'],
};

export const validateSsn = ajv.compile(ssnSchema);
export const validateName = ajv.compile(nameSchema);

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

export const validatePersonLookupResponse = ajv.compile(personLookupResponseSchema);
