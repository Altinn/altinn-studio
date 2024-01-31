import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

interface ReturnType {
  newValue: any;
  error: boolean;
}

type Value = string | number | boolean | null;
const AllValidTypes = ['string', 'number', 'integer', 'boolean', 'null'] as const;
type ValidTypes = (typeof AllValidTypes)[number];

/**
 * Converts a string to a value based on a schema.
 */
export function convertData(value: Value, schema: JSONSchema7 | undefined): ReturnType {
  if (!schema) {
    // Assume it's a string if we don't have a binding. This is not likely to happen as long as components aren't
    // even rendered when their data model bindings fail.
    return { newValue: String(value), error: false };
  }

  try {
    return convertToType(value, schema);
  } catch (e) {
    window.logError(`Error converting data to schema (${JSON.stringify(schema)}) defined by data model:\n`, e);
    return { newValue: undefined, error: true };
  }
}

function convertToType(value: Value, schema: JSONSchema7 | JSONSchema7Definition): ReturnType {
  if (typeof schema === 'object' && schema.anyOf) {
    const results = schema.anyOf.map((subSchema) => convertToType(value, subSchema));
    const validResult = results.find((result) => !result.error);
    return validResult ?? { newValue: undefined, error: true };
  }

  if (typeof schema === 'object' && schema.oneOf) {
    const results = schema.oneOf.map((subSchema) => convertToType(value, subSchema));
    const validResults = results.filter((result) => !result.error);
    if (validResults.length === 1) {
      return validResults[0];
    }
    return { newValue: undefined, error: true };
  }

  if (
    typeof schema === 'object' &&
    schema.type &&
    typeof schema.type === 'string' &&
    AllValidTypes.includes(schema.type as any)
  ) {
    return convertToScalar(value, schema.type as ValidTypes);
  }

  throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
}

function convertToScalar(value: Value, targetType: ValidTypes): ReturnType {
  const sVal = String(value);
  if (targetType === 'string') {
    return { newValue: sVal, error: false };
  }

  if (targetType === 'number') {
    const parsed = asDecimal(sVal);
    return isNaN(parsed) ? { newValue: undefined, error: true } : { newValue: parsed, error: false };
  }

  if (targetType === 'integer') {
    const parsed = asInt32(sVal);
    return isNaN(parsed) ? { newValue: undefined, error: true } : { newValue: parsed, error: false };
  }

  if (targetType === 'boolean') {
    return sVal === 'true' || sVal === 'false'
      ? { newValue: sVal === 'true', error: false }
      : { newValue: undefined, error: true };
  }

  // Nothing else matched, target type is null
  if (sVal === 'null') {
    return { newValue: null, error: false };
  }
  return { newValue: undefined, error: true };
}

/**
 * Checks if a string can be parsed to a decimal in C#.
 * 1. Empty string is not valid
 * 2. Value must be parsable as float in javascript
 * 3. Value must be between +- 7.9e28
 * 4. Spaces will be removed, and commas will be replaced with dots
 * @see https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types
 */
export function asDecimal(value: string): number {
  if (!value.length) {
    return NaN;
  }
  const trimmed = value.replace(/,/g, '.').replace(/\s/g, '');
  if (trimmed.endsWith('.')) {
    return NaN;
  }
  const parsedValue = parseFloat(trimmed);
  return !isNaN(parsedValue) && isFinite(parsedValue) && parsedValue < 7.92e28 && parsedValue > -7.92e28
    ? parsedValue
    : NaN;
}

export function asInt32(value: string): number {
  if (!value.length) {
    return NaN;
  }
  const trimmed = value.replace(/,/g, '').replace(/\s/g, '');
  if (!trimmed.match(/^-?\d+$/)) {
    return NaN;
  }
  const parsedValue = parseInt(trimmed);
  return !isNaN(parsedValue) && isFinite(parsedValue) && parsedValue < 2147483647 && parsedValue > -2147483648
    ? parsedValue
    : NaN;
}
