import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { lookupValidation } from 'src/layout/lookupValidation';
import type { LookupFailure } from 'src/core/queries/lookup';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';

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

const modularAdditiveInverse = (value: number, base: number): number => base - (value % base);

const failureMessages: Record<LookupFailure, string> = {
  notFound: 'organization_lookup.validation_error_not_found',
  invalidResponse: 'organization_lookup.validation_invalid_response_from_server',
  forbidden: 'organization_lookup.unknown_error',
  tooManyRequests: 'organization_lookup.unknown_error',
  unknown: 'organization_lookup.unknown_error',
};

export function validateOrganizationLookup(
  ctx: ComponentValidationContext<'OrganizationLookup'>,
): ComponentValidation[] {
  const bindings = ctx.component.dataModelBindings;
  const savedOrgNr = readDataFromState(ctx.formState, bindings?.orgnr);
  const validations: ComponentValidation[] = [];
  if (savedOrgNr && !checkValidOrgnNr(String(savedOrgNr))) {
    validations.push(lookupValidation('organization_lookup.validation_error_orgnr', 'orgnr'));
  }

  const input = ctx.formState.lookup.inputs[ctx.indexedId];
  if (input?.type === 'OrganizationLookup' && !savedOrgNr) {
    if (!checkValidOrgnNr(input.orgNr)) {
      validations.push(lookupValidation('organization_lookup.validation_error_orgnr', 'orgnr'));
    }
    if (input.failure) {
      validations.push(lookupValidation(failureMessages[input.failure]));
    }
  }
  return validations;
}
