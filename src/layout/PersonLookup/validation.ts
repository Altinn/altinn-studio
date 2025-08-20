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
  // Check that we have 11 characters and that they are all digits
  if (ssn.length !== 11 || !/^\d{11}$/.test(ssn)) {
    return false;
  }

  const digits = ssn.split('').map(Number);
  const k1 = digits[9];
  const k2 = digits[10];

  // Calculate first control digit (K1)
  const weights1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * weights1[i];
  }

  let calculated_k1 = mod11(sum1);
  if (calculated_k1 === 11) {
    calculated_k1 = 0;
  }

  // Calculate second control digit (K2)
  const weights2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    if (i === 9) {
      sum2 += calculated_k1 * weights2[i];
    } else {
      sum2 += digits[i] * weights2[i];
    }
  }

  let calculated_k2 = mod11(sum2);
  if (calculated_k2 === 11) {
    calculated_k2 = 0;
  }

  // Validate controls and return result
  return k1 === calculated_k1 && k2 === calculated_k2;
}

const mod11 = (value: number): number => 11 - (value % 11);

export const validateSsn = ajv.compile(ssnSchema);

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
