import { useMemo } from 'react';

import { useCurrentDataModelSchema } from 'src/features/datamodel/DataModelSchemaProvider';
import { useCurrentDataModelType } from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { type FieldValidations, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import {
  createValidator,
  getErrorParams,
  getErrorTextKey,
} from 'src/features/validation/schemaValidation/schemaValidationUtils';
import {
  getRootElementPath,
  getSchemaPart,
  getSchemaPartOldGenerator,
  processInstancePath,
} from 'src/utils/schemaUtils';
import type { TextReference } from 'src/features/language/useLanguage';

const __default__ = {};

export function useSchemaValidation(): FieldValidations {
  const formData = FD.useDebounced();
  const schema = useCurrentDataModelSchema();
  const dataType = useCurrentDataModelType();

  /**
   * Create a validator for the current schema and data type.
   */
  const [validator, rootElementPath] = useMemo(() => {
    if (!schema || !dataType) {
      return [undefined, undefined] as const;
    }

    return [createValidator(schema), getRootElementPath(schema, dataType)] as const;
  }, [schema, dataType]);

  /**
   * Perform validation using AJV schema validation.
   */
  return useMemo(() => {
    if (!validator || rootElementPath === undefined || !schema) {
      return __default__;
    }

    const valid = validator.validate(`schema${rootElementPath}`, structuredClone(formData));
    if (valid) {
      return __default__;
    }

    const fieldValidations: FieldValidations = {};

    for (const error of validator.errors || []) {
      /**
       * Skip schema validation for empty fields and ignore required errors. Let component validation handle these.
       * Check if AVJ validation error is a oneOf error ("must match exactly one schema in oneOf").
       * We don't currently support oneOf validation.
       * These can be ignored, as there will be other, specific validation errors that actually
       * from the specified sub-schemas that will trigger validation errors where relevant.
       */
      if (
        error.data == null ||
        error.data === '' ||
        error.keyword === 'required' || // TODO(Validation): Check if this can be filtered out later
        error.keyword === 'oneOf' ||
        error.params?.type === 'null'
      ) {
        continue;
      }

      /**
       * Get schema for the field that failed validation.
       * Backward compatible if we are validating against a sub scheme.
       */
      const fieldSchema = rootElementPath
        ? getSchemaPartOldGenerator(error.schemaPath, schema, rootElementPath)
        : getSchemaPart(error.schemaPath, schema);

      /**
       * Get TextReference for error message.
       * Either a standardized language key or a custom error message from the schema.
       */
      const message: TextReference = fieldSchema?.errorMessage
        ? { key: fieldSchema.errorMessage }
        : {
            key: getErrorTextKey(error),
          };

      /**
       * Extract error parameters and add to message if available.
       */
      const errorParams = getErrorParams(error);
      if (errorParams !== null) {
        message['params'] = [errorParams];
      }

      /**
       * Extract data model field from the error's instancePath
       */
      const field = processInstancePath(error.instancePath);

      if (!fieldValidations[field]) {
        fieldValidations[field] = [];
      }

      fieldValidations[field].push({
        message,
        field,
        source: FrontendValidationSource.Schema,
        category: ValidationMask.Schema,
        severity: 'error',
      });
    }

    return fieldValidations;
  }, [formData, rootElementPath, schema, validator]);
}
