import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import addAdditionalFormats from 'ajv-formats-draft2019';
import type { ErrorObject, Options } from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import { ValidationMask } from 'src/features/validation';
import type { ValidationCategory } from 'src/features/validation';

/**
 * Create a new ajv validator for a given schema.
 */
export function createValidator(schema: JSONSchema7): Ajv {
  const ajvOptions: Options = {
    allErrors: true,
    coerceTypes: true,
    strict: false,
    strictTypes: false,
    strictTuples: false,
    unicodeRegExp: false,
    code: { es5: true },
    // Gives access to the data property
    verbose: true,
  };

  const ajv = schema.$schema?.includes('2020-12') ? new Ajv2020(ajvOptions) : new Ajv(ajvOptions);
  addFormats(ajv);
  addAdditionalFormats(ajv);
  ajv.addFormat('year', /^\d{4}$/);
  ajv.addFormat('year-month', /^\d{4}-(0[1-9]|1[0-2])$/);
  ajv.addSchema(schema, 'schema');
  return ajv;
}

/**
 * A mapping between the json schema validation error keywords and the language keys used for the standard validation.
 */
const errorTypes: { [type in string]: { textKey: string; paramKey: string } | undefined } = {
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
    paramKey: 'allowedValue',
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
 * Extract standarized language key from an error object.
 */
export function getErrorTextKey(error: ErrorObject): string {
  const errorType = errorTypes[error.keyword];
  const textKey = errorType ? errorType.textKey : error.keyword;
  return `validation_errors.${textKey}`;
}

/**
 * Extract error parameters from an error object.
 */
export function getErrorParams(error: ErrorObject): string | null {
  const errorType = errorTypes[error.keyword];
  if (typeof errorType === 'undefined') {
    window.logWarnOnce(`Schema validation: Error message for ${error.keyword} not implemented`);
    return null;
  }
  const errorParams = error.params[errorType.paramKey];
  return Array.isArray(errorParams) ? errorParams.join(', ') : errorParams;
}

/**
 * Get the category of an error object.
 * Validation types that act essentially like required should be treated as such
 * so they do not give errors before the user has an opportunity to fill anything out.
 */
export function getErrorCategory(error: ErrorObject): ValidationCategory {
  switch (error.keyword) {
    case 'required':
    case 'minItems':
      return ValidationMask.Required;
    default:
      return ValidationMask.Schema;
  }
}
