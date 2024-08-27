import { useMemo } from 'react';

import dot from 'dot-object';

import { FD } from 'src/features/formData/FormDataWrite';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { FieldValidations } from 'src/features/validation';

const __default__ = {};

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function useInvalidDataValidation(): FieldValidations {
  const invalidData = FD.useInvalidDebounced();

  return useMemo(() => {
    if (Object.keys(invalidData).length === 0) {
      return __default__;
    }

    return Object.entries(dot.dot(invalidData))
      .filter(([_, value]) => isScalar(value))
      .reduce((validations, [field, _]) => {
        if (!validations[field]) {
          validations[field] = [];
        }

        validations[field].push({
          field,
          source: FrontendValidationSource.InvalidData,
          message: { key: 'validation_errors.pattern' },
          severity: 'error',
          category: ValidationMask.Schema, // Use same visibility as schema validations
        });

        return validations;
      }, {});
  }, [invalidData]);
}
