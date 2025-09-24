/* eslint-disable no-case-declarations */
import Ajv from 'ajv';
import type { DefinedError } from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import { pointerToDotNotation } from 'src/features/datamodel/notations';

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
 * Format an AJV validation error into a human readable string.
 * @param error the AJV validation error object
 * @returns a human readable string describing the error
 */
export function formatLayoutSchemaValidationError(error: DefinedError): string | null {
  if (error.parentSchema?.comment === 'ignore') {
    return null;
  }

  const canBeExpression = error.parentSchema?.comment === 'expression';

  const property = pointerToDotNotation(error.instancePath);
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
    case 'minimum':
      if (error.params.comparison === '>=') {
        return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` er mindre enn minimumsverdien ${
          error.params.limit
        }`;
      }

      return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` er mindre enn eller lik minimumsverdien ${
        error.params.limit
      }`;
    case 'maximum':
      if (error.params.comparison === '<=') {
        return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` er større enn maksimumsverdien ${
          error.params.limit
        }`;
      }

      return `Ugyldig verdi for egenskapen ${propertyString}, verdien \`${error.data}\` er større enn eller lik maksimumsverdien ${
        error.params.limit
      }`;
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
