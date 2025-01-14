import { useEffect, useMemo } from 'react';

import { FrontendValidationSource } from '..';
import type { FieldValidations } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { pointerToDotNotation } from 'src/features/datamodel/notations';
import { useDataModelType } from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import {
  createValidator,
  getErrorCategory,
  getErrorParams,
  getErrorTextKey,
} from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { Validation } from 'src/features/validation/validationContext';
import { getRootElementPath, getSchemaPart, getSchemaPartOldGenerator } from 'src/utils/schemaUtils';
import type { TextReference } from 'src/features/language/useLanguage';

export function SchemaValidation({ dataType }: { dataType: string }) {
  const updateDataModelValidations = Validation.useUpdateDataModelValidations();

  const formData = FD.useDebounced(dataType);
  const schema = DataModels.useDataModelSchema(dataType);
  const dataTypeDef = useDataModelType(dataType);
  const dataElementId = DataModels.useDataElementIdForDataType(dataType) ?? dataType; // stateless does not have dataElementId

  /**
   * Create a validator for the current schema and data type.
   */
  const [validator, rootElementPath] = useMemo(() => {
    if (!schema || !dataTypeDef) {
      return [undefined, undefined] as const;
    }

    return [createValidator(schema), getRootElementPath(schema, dataTypeDef)] as const;
  }, [schema, dataTypeDef]);

  /**
   * Perform validation using AJV schema validation.
   */
  useEffect(() => {
    if (validator && rootElementPath !== undefined && schema) {
      const valid = validator.validate(`schema${rootElementPath}`, structuredClone(formData));
      const validations: FieldValidations = {};
      if (!valid) {
        const errors = validator.errors ?? [];
        for (const error of errors) {
          /**
           * Skip schema validation for empty fields and ignore required errors.
           * JSON schema required does not work too well for our use case. The expectation that a missing field should give an error is not necessarily true,
           * since it will not work in nested objects if the parent is also missing.
           * Check if AVJ validation error is a oneOf error ("must match exactly one schema in oneOf").
           * We don't currently support oneOf validation.
           * These can be ignored, as there will be other, specific validation errors that actually
           * from the specified sub-schemas that will trigger validation errors where relevant.
           */
          if (
            error.data == null ||
            error.data === '' ||
            error.keyword === 'required' ||
            error.keyword === 'oneOf' ||
            error.params?.type === 'null'
          ) {
            continue;
          }

          /**
           * Don't include errors for formatMinimum and formatMaximum if the value violates the format itself
           */
          if (
            (error.keyword === 'formatMinimum' ||
              error.keyword === 'formatMaximum' ||
              error.keyword === 'formatExclusiveMinimum' ||
              error.keyword === 'formatExclusiveMaximum') &&
            !!errors.find((e) => e.keyword === 'format' && e.instancePath === error.instancePath)
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

          const category = getErrorCategory(error);

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
          const field = pointerToDotNotation(error.instancePath);

          if (!validations[field]) {
            validations[field] = [];
          }

          validations[field].push({
            message,
            field,
            dataElementId,
            source: FrontendValidationSource.Schema,
            category,
            severity: 'error',
          });
        }
      }

      updateDataModelValidations('schema', dataElementId, validations);
    }
  }, [dataElementId, formData, rootElementPath, schema, updateDataModelValidations, validator]);

  return null;
}
