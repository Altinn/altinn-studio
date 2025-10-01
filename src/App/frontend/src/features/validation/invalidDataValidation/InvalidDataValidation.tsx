import { useEffect } from 'react';

import dot from 'dot-object';

import { FrontendValidationSource, ValidationMask } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { Validation } from 'src/features/validation/validationContext';

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function InvalidDataValidation({ dataType }: { dataType: string }) {
  const updateDataModelValidations = Validation.useUpdateDataModelValidations();
  const invalidData = FD.useInvalidDebounced(dataType);
  const dataElementId = DataModels.useDataElementIdForDataType(dataType) ?? dataType; // stateless does not have dataElementId

  useEffect(() => {
    const validations = {};

    if (Object.keys(invalidData).length > 0) {
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
          source: FrontendValidationSource.InvalidData,
          message: { key: 'validation_errors.pattern' },
          severity: 'error',
          category: ValidationMask.Schema, // Use same visibility as schema validations
        });
      }
    }
    updateDataModelValidations('invalidData', dataElementId, validations);
  }, [dataElementId, invalidData, updateDataModelValidations]);

  return null;
}
