import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import addAdditionalFormats from 'ajv-formats-draft2019';
import type { Options } from 'ajv';
import type * as AjvCore from 'ajv/dist/core';

import { getCurrentDataTypeForApplication } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import {
  getRootElementPath,
  getSchemaPart,
  getSchemaPartOldGenerator,
  processInstancePath,
} from 'src/utils/schemaUtils';
import type { IJsonSchemas } from 'src/features/datamodel';
import type { IFormData } from 'src/features/formData';
import type { ValidLanguageKey } from 'src/hooks/useLanguage';
import type { IDataType } from 'src/types/shared';
import type { IValidationContext } from 'src/utils/validation/types';

export interface ISchemaValidator {
  rootElementPath: string;
  schema: any;
  validator: Ajv;
}

export interface ISchemaValidators {
  [id: string]: ISchemaValidator;
}

/**
 * This format is returned by the json schema validation, and needs to be mapped to components based on the datamodel bindingField.
 */
export type ISchemaValidationError = {
  message: string;
  bindingField: string;
  invalidDataType: boolean;
  keyword: string;
};

const validators: ISchemaValidators = {};

export function getValidator(typeId: string, schemas: IJsonSchemas, dataType: IDataType) {
  if (!validators[typeId]) {
    validators[typeId] = createValidator(schemas[typeId], dataType);
  }
  return validators[typeId];
}

export function createValidator(schema: any, dataType: IDataType): ISchemaValidator {
  const ajvOptions: Options = {
    allErrors: true,
    coerceTypes: true,

    /**
     * This option is deprecated in AJV, but continues to work for now. We have unit tests that will fail if the
     * functionality is removed from AJV. The jsPropertySyntax (ex. 'Path.To.Array[0].Item') was replaced with JSON
     * pointers in v7 (ex. '/Path/To/Array/0/Item'). If the option to keep the old syntax is removed at some point,
     * we'll have to implement a translator ourselves, as we'll need this format to equal our data model bindings.
     *
     * @see https://github.com/ajv-validator/ajv/issues/1577#issuecomment-832216719
     */
    jsPropertySyntax: true,

    strict: false,
    strictTypes: false,
    strictTuples: false,
    unicodeRegExp: false,
    code: { es5: true },
  };

  const ajv = schema.$schema?.includes('2020-12') ? new Ajv2020(ajvOptions) : new Ajv(ajvOptions);
  addFormats(ajv);
  addAdditionalFormats(ajv);
  ajv.addFormat('year', /^\d{4}$/);
  ajv.addFormat('year-month', /^\d{4}-(0[1-9]|1[0-2])$/);
  ajv.addSchema(schema, 'schema');

  return {
    validator: ajv,
    schema,
    rootElementPath: getRootElementPath(schema, dataType),
  };
}

/**
 * Check if AVJ validation error is a oneOf error ("must match exactly one schema in oneOf").
 * We don't currently support oneOf validation.
 * These can be ignored, as there will be other, specific validation errors that actually
 * from the specified sub-schemas that will trigger validation errors where relevant.
 * @param error the AJV validation error object
 * @returns a value indicating if the provided error is a "oneOf" error.
 */
export const isOneOfError = (error: AjvCore.ErrorObject): boolean =>
  error.keyword === 'oneOf' || error.params?.type === 'null';

/**
 * A mapping between the json schema validation error keywords and the language keys used for the standard validation.
 */
export const errorMessageKeys = {
  minimum: {
    textKey: 'min',
    paramKey: 'limit',
  },
  exclusiveMinimum: {
    textKey: 'min',
    paramKey: 'limit',
  },
  maximum: {
    textKey: 'max',
    paramKey: 'limit',
  },
  exclusiveMaximum: {
    textKey: 'max',
    paramKey: 'limit',
  },
  minLength: {
    textKey: 'minLength',
    paramKey: 'limit',
  },
  maxLength: {
    textKey: 'maxLength',
    paramKey: 'limit',
  },
  pattern: {
    textKey: 'pattern',
    paramKey: 'pattern',
  },
  format: {
    textKey: 'pattern',
    paramKey: 'format',
  },
  type: {
    textKey: 'pattern',
    paramKey: 'type',
  },
  required: {
    textKey: 'required',
    paramKey: 'limit',
  },
  enum: {
    textKey: 'enum',
    paramKey: 'allowedValues',
  },
  const: {
    textKey: 'enum',
    paramKey: 'allowedValues',
  },
  multipleOf: {
    textKey: 'multipleOf',
    paramKey: 'multipleOf',
  },
  oneOf: {
    textKey: 'oneOf',
    paramKey: 'passingSchemas',
  },
  anyOf: {
    textKey: 'anyOf',
    paramKey: 'passingSchemas',
  },
  allOf: {
    textKey: 'allOf',
    paramKey: 'passingSchemas',
  },
  not: {
    textKey: 'not',
    paramKey: 'passingSchemas',
  },
  formatMaximum: {
    textKey: 'formatMaximum',
    paramKey: 'limit',
  },
  formatMinimum: {
    textKey: 'formatMinimum',
    paramKey: 'limit',
  },
  formatExclusiveMaximum: {
    textKey: 'formatMaximum',
    paramKey: 'limit',
  },
  formatExclusiveMinimum: {
    textKey: 'formatMinimum',
    paramKey: 'limit',
  },
  minItems: {
    textKey: 'minItems',
    paramKey: 'limit',
  },
  maxItems: {
    textKey: 'maxItems',
    paramKey: 'limit',
  },
};

/**
 * Validates the form data against the schema and returns a list of schema validation errors.
 * @see ISchemaValidationError
 */
export function getSchemaValidationErrors(
  { formData, langTools, application, instance, layoutSets, schemas }: IValidationContext,
  overrideFormData?: IFormData,
): ISchemaValidationError[] {
  const currentDataTaskDataTypeId = getCurrentDataTypeForApplication({
    application,
    instance,
    layoutSets,
  });
  const dataType = application?.dataTypes.find((d) => d.id === currentDataTaskDataTypeId);
  if (!currentDataTaskDataTypeId || !dataType) {
    return [];
  }

  const { validator, rootElementPath, schema } = getValidator(currentDataTaskDataTypeId, schemas, dataType);
  const formDataToValidate = { ...formData, ...overrideFormData };
  const model = convertDataBindingToModel(formDataToValidate);
  const valid = validator.validate(`schema${rootElementPath}`, model);

  if (valid) {
    return [];
  }
  const validationErrors: ISchemaValidationError[] = [];

  for (const error of validator.errors || []) {
    // Required fields are handled separately
    if (error.keyword === 'required') {
      continue;
    }

    if (isOneOfError(error)) {
      continue;
    }
    const invalidDataType = error.keyword === 'type' || error.keyword === 'format';

    let errorParams = error.params[errorMessageKeys[error.keyword]?.paramKey];
    if (errorParams === undefined) {
      console.warn(`WARN: Error message for ${error.keyword} not implemented`);
    }
    if (Array.isArray(errorParams)) {
      errorParams = errorParams.join(', ');
    }

    // backward compatible if we are validating against a sub scheme.
    const fieldSchema = rootElementPath
      ? getSchemaPartOldGenerator(error.schemaPath, schema, rootElementPath)
      : getSchemaPart(error.schemaPath, schema);

    const errorMessage = fieldSchema?.errorMessage
      ? langTools.langAsString(fieldSchema.errorMessage)
      : langTools.langAsString(
          `validation_errors.${errorMessageKeys[error.keyword]?.textKey || error.keyword}` as ValidLanguageKey,
          [errorParams],
        );

    const field = processInstancePath(error.instancePath);
    validationErrors.push({ message: errorMessage, bindingField: field, invalidDataType, keyword: error.keyword });
  }

  return validationErrors;
}
