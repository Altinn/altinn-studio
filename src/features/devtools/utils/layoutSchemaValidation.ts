/* eslint-disable no-case-declarations */
import Ajv from 'ajv';
import type { DefinedError, ErrorObject } from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import { getLayoutComponentObject } from 'src/layout';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { LayoutValidationErrors } from 'src/features/devtools/layoutValidation/types';
import type { ILayouts } from 'src/layout/layout';

export const LAYOUT_SCHEMA_NAME = 'layout.schema.v1.json';
export const EMPTY_SCHEMA_NAME = '__empty__';

/**
 * Create a validator for the layout schema.
 */
export function createLayoutValidator(layoutSchema: JSONSchema7) {
  const ajv = new Ajv({
    allErrors: true,
    messages: false,
    strict: false,
    strictTypes: false,
    strictTuples: false,
    verbose: true,
  });
  ajv.addSchema(removeExpressionRefs(layoutSchema), LAYOUT_SCHEMA_NAME);
  ajv.addSchema({ additionalProperties: false }, EMPTY_SCHEMA_NAME);
  return ajv;
}

/**
 * Validate a layout set against the layout schema.
 * @returns an array of human readable validation messages
 */
export function validateLayoutSet(layoutSetId: string, layouts: ILayouts, validator: Ajv) {
  const out: LayoutValidationErrors = {
    [layoutSetId]: {},
  };

  /**
   * Validation function passed to component classes.
   * Component class decides which schema pointer to use and what data to validate.
   * If pointer is null, it will validate against an empty schema with additionalProperties=false,
   * to indicate that everything is invalid. Useful for grid cells where the type cannot be decided.
   * Component classes can choose to modify the output errors before returning.
   */
  function validate(pointer: string | null, data: unknown): ErrorObject[] | undefined {
    const isValid = pointer?.length
      ? validator.validate(`${LAYOUT_SCHEMA_NAME}${pointer}`, data)
      : validator.validate(EMPTY_SCHEMA_NAME, data);
    if (!isValid && validator.errors) {
      return validator.errors;
    }
    return undefined;
  }

  for (const [layoutName, layout] of Object.entries(layouts)) {
    out[layoutSetId][layoutName] = {};
    for (const component of layout || []) {
      const def = getLayoutComponentObject(component.type);
      const errors = def.validateLayoutConfing(component as any, validate);

      out[layoutSetId][layoutName][component.id] = [];

      if (errors) {
        const errorMessages = errors
          .map(formatError)
          .filter((m) => m != null)
          .filter(duplicateStringFilter) as string[];

        if (errorMessages.length) {
          out[layoutSetId][layoutName][component.id].push(...errorMessages);
        }
      }
    }
  }
  return out;
}

/**
 * Replace references to expression schema with anyOf[<type>, array].
 * Add comment to signal that the value can be an expression or <type>.
 * Add comment to ignore the array case to avoid duplicate errors.
 */
function removeExpressionRefs(schema: JSONSchema7): JSONSchema7 {
  const processedSchema = structuredClone(schema);
  removeExpressionRefsRecursive(processedSchema);
  return processedSchema;
}

function removeExpressionRefsRecursive(schema: object) {
  if (Array.isArray(schema)) {
    for (const item of schema) {
      if (typeof item === 'object' && item !== null) {
        removeExpressionRefsRecursive(item);
      }
    }
  }
  if (typeof schema === 'object') {
    for (const [key, value] of Object.entries(schema)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('expression.schema.v1.json#/definitions/')) {
        const type = value.replace('expression.schema.v1.json#/definitions/', '');
        delete schema['$ref'];
        schema['anyOf'] = [
          { type, comment: 'expression' },
          { type: 'array', comment: 'ignore' },
        ];
      }
      if (typeof value === 'object' && value !== null) {
        removeExpressionRefsRecursive(value);
      }
    }
  }
}

/**
 * Get the property path for the error. Empty means it is in the root of the component.
 */
function getProperty(error: ErrorObject): string | undefined {
  const instancePaths = error.instancePath.split('/').slice(1);

  if (instancePaths.length === 0) {
    return undefined;
  }

  return instancePaths
    .map((path, i) => {
      if (!isNaN(parseInt(path))) {
        return `[${path}]`;
      }
      return `${i != 0 ? '.' : ''}${path}`;
    })
    .join('');
}

/**
 * Format an AJV validation error into a human readable string.
 * @param error the AJV validation error object
 * @returns a human readable string describing the error
 */
function formatError(error: DefinedError): string | null {
  if (error.parentSchema?.comment === 'ignore') {
    return null;
  }

  const canBeExpression = error.parentSchema?.comment === 'expression';

  const property = getProperty(error);
  const propertyString = property?.length ? `\`${property}\`` : '';
  const propertyReference = property?.length ? ` i \`${property}\`` : '';

  switch (error.keyword) {
    case 'additionalProperties':
      return `Egenskapen \`${error.params.additionalProperty}\` er ikke tillatt${propertyReference}`;
    case 'required':
      return `Egenskapen \`${error.params.missingProperty}\` er påkrevd${propertyReference}`;
    case 'pattern':
      return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` samsvarer ikke med mønsteret \`${error.params.pattern}\``;
    case 'enum':
      const allowedValues = error.params.allowedValues.map((v) => `'${v}'`).join(', ');
      return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` er ikke blant de tillatte verdiene: \`[${allowedValues}]\``;
    case 'type':
      return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` er ikke av typen \`${
        error.params.type
      }\` ${canBeExpression ? 'eller et uttrykk' : ''}`;
    case 'if':
    case 'anyOf':
    case 'oneOf':
    case 'const':
    case 'additionalItems':
      // Ignore these keywords as they are mostly useless feedback and caused by other errors that are easier to identify.
      return null;
    default:
      // Leaving this here in case we discover other keywords that we want to either properly report or ignore.
      return JSON.stringify(error);
  }
}
