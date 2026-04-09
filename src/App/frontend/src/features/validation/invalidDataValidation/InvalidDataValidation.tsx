import dot from 'dot-object';

import { FrontendValidationSource, ValidationMask } from '..';
import type { FieldValidations } from '..';

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

interface DeriveInvalidDataValidationsParams {
  invalidData: object;
  dataElementId: string;
}

export function deriveInvalidDataValidations({
  invalidData,
  dataElementId,
}: DeriveInvalidDataValidationsParams): FieldValidations {
  const validations: FieldValidations = {};

  if (Object.keys(invalidData).length === 0) {
    return validations;
  }

  const flattened = dot.dot(invalidData);
  for (const [field, value] of Object.entries(flattened)) {
    if (!isScalar(value)) {
      continue;
    }

    if (!validations[field]) {
      validations[field] = [];
    }

    validations[field].push({
      field,
      dataElementId,
      source: FrontendValidationSource.InvalidData,
      message: { key: 'validation_errors.pattern' },
      severity: 'error',
      category: ValidationMask.Schema,
    });
  }

  return validations;
}
