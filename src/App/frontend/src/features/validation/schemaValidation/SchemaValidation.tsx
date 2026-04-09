import { FrontendValidationSource } from '..';
import type { FieldValidations } from '..';

import { pointerToDotNotation } from 'src/features/datamodel/notations';
import {
  getErrorCategory,
  getErrorParams,
  getErrorTextKey,
} from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { getSchemaPart, getSchemaPartOldGenerator } from 'src/utils/schemaUtils';
import type { DataModelSchemaResult } from 'src/features/datamodel/SchemaLookupTool';
import type { TextReference } from 'src/features/language/useLanguage';

interface DeriveSchemaValidationsParams {
  formData: object;
  schemaResult: DataModelSchemaResult;
  dataElementId: string;
}

export function deriveSchemaValidations({
  formData,
  schemaResult,
  dataElementId,
}: DeriveSchemaValidationsParams): FieldValidations {
  const { validator, rootElementPath, schema } = schemaResult;
  const valid = validator.validate(`schema${rootElementPath}`, structuredClone(formData));
  const validations: FieldValidations = {};
  if (valid) {
    return validations;
  }

  const errors = validator.errors ?? [];
  for (const error of errors) {
    if (
      error.data == null ||
      error.data === '' ||
      error.keyword === 'required' ||
      error.keyword === 'oneOf' ||
      error.params?.type === 'null'
    ) {
      continue;
    }

    if (
      (error.keyword === 'formatMinimum' ||
        error.keyword === 'formatMaximum' ||
        error.keyword === 'formatExclusiveMinimum' ||
        error.keyword === 'formatExclusiveMaximum') &&
      !!errors.find((e) => e.keyword === 'format' && e.instancePath === error.instancePath)
    ) {
      continue;
    }

    const fieldSchema = rootElementPath
      ? getSchemaPartOldGenerator(error.schemaPath, schema, rootElementPath)
      : getSchemaPart(error.schemaPath, schema);

    const message: TextReference = fieldSchema?.errorMessage
      ? { key: fieldSchema.errorMessage }
      : {
          key: getErrorTextKey(error),
        };

    const category = getErrorCategory(error);
    const errorParams = getErrorParams(error);
    if (errorParams !== null) {
      message['params'] = [errorParams];
    }

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

  return validations;
}
