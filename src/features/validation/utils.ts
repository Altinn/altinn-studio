import { ValidationMask } from 'src/features/validation';
import type {
  AnyValidation,
  BaseValidation,
  FieldValidations,
  ValidationMaskKeys,
  ValidationSeverity,
} from 'src/features/validation';
import type { AllowedValidationMasks } from 'src/layout/common.generated';

export function mergeFieldValidations(...X: FieldValidations[]): FieldValidations {
  if (X.length === 0) {
    return {};
  }

  if (X.length === 1) {
    return X[0];
  }

  const [X1, ...XRest] = X;
  const out = structuredClone(X1);
  for (const Xn of XRest) {
    for (const [field, validations] of Object.entries(structuredClone(Xn))) {
      if (!out[field]) {
        out[field] = [];
      }
      out[field].push(...validations);
    }
  }
  return out;
}

function isOfSeverity<V extends BaseValidation, S extends ValidationSeverity>(severity: S) {
  return (validation: V): validation is V & { severity: S } => validation.severity === severity;
}
export function validationsOfSeverity<I extends BaseValidation, S extends ValidationSeverity>(
  validations: I[] | undefined,
  severity: S,
) {
  return validations?.filter(isOfSeverity(severity)) ?? [];
}

export function hasValidationErrors<V extends BaseValidation>(validations: V[] | undefined): boolean {
  return validations?.some((validation) => validation.severity === 'error') ?? false;
}

export function isValidationVisible<T extends AnyValidation>(validation: T, mask: number): boolean {
  if (validation.category === 0) {
    return true;
  }

  if ('visibility' in validation && validation.visibility !== undefined) {
    const specificMask = mask | validation.visibility;
    return (specificMask & validation.category) > 0;
  }

  return (mask & validation.category) > 0;
}

export function selectValidations<T extends BaseValidation>(
  validations: T[],
  mask: number,
  severity?: ValidationSeverity,
) {
  const filteredValidations = severity ? validationsOfSeverity(validations, severity) : validations;
  return filteredValidations.filter((validation) => isValidationVisible(validation, mask));
}

/**
 * Gets the initial validation mask for a component using its showValidations property
 * If the value is not set, it will default to all validations except required
 */
export function getInitialMaskFromNode(showValidations: AllowedValidationMasks | null | undefined): number {
  // If not set, null, or undefined, default to all validations except required
  if (!showValidations) {
    return ValidationMask.AllExceptRequired;
  }
  return getVisibilityMask(showValidations);
}

export function getVisibilityMask(maskKeys?: ValidationMaskKeys[]): number {
  let mask = 0;
  if (!maskKeys) {
    return mask;
  }
  for (const maskKey of maskKeys) {
    mask |= ValidationMask[maskKey];
  }
  return mask;
}
