import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { lookupValidation } from 'src/layout/lookupValidation';
import type { LookupFailure } from 'src/core/queries/lookup';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';

export function checkValidSsn(ssn: string): boolean {
  // Check that we have 11 characters and that they are all digits
  if (ssn.length !== 11 || !/^\d{11}$/.test(ssn)) {
    return false;
  }

  const digits = ssn.split('').map(Number);
  const k1 = digits.at(-2)!;
  const k2 = digits.at(-1)!;

  // Calculate first control digit (K1)
  const weights1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * weights1[i];
  }

  let calculated_k1 = modularAdditiveInverse(sum1, 11);
  calculated_k1 = calculated_k1 % 11;

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

  let calculated_k2 = modularAdditiveInverse(sum2, 11);
  calculated_k2 = calculated_k2 % 11;

  // Validate controls and return result
  return k1 === calculated_k1 && k2 === calculated_k2;
}

const modularAdditiveInverse = (value: number, base: number): number => base - (value % base);

const failureMessages: Record<LookupFailure, string> = {
  notFound: 'person_lookup.validation_error_not_found',
  invalidResponse: 'person_lookup.validation_invalid_response_from_server',
  forbidden: 'person_lookup.validation_error_forbidden',
  tooManyRequests: 'person_lookup.validation_error_too_many_requests',
  unknown: 'person_lookup.unknown_error',
};

export function validatePersonLookup(ctx: ComponentValidationContext<'PersonLookup'>): ComponentValidation[] {
  const bindings = ctx.component.dataModelBindings;
  const savedSsn = readDataFromState(ctx.formState, bindings?.ssn);
  const validations: ComponentValidation[] = [];
  if (savedSsn && !checkValidSsn(String(savedSsn))) {
    validations.push(lookupValidation('person_lookup.validation_error_ssn', 'ssn'));
  }

  const input = ctx.formState.lookup.inputs[ctx.indexedId];
  if (input?.type === 'PersonLookup' && !savedSsn) {
    if (!checkValidSsn(input.ssn)) {
      validations.push(lookupValidation('person_lookup.validation_error_ssn', 'ssn'));
    }
    if (!input.lastName.trim()) {
      validations.push(lookupValidation('person_lookup.validation_error_name_too_short', 'fullName'));
    }
    if (input.failure) {
      validations.push(lookupValidation(failureMessages[input.failure]));
    }
  }
  return validations;
}
