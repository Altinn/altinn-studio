import type { JSONSchema7 } from 'json-schema';

/**
 * Converts a string to a value based on a schema.
 */
export function convertData(
  value: string | number | boolean,
  schema: JSONSchema7 | undefined,
): {
  newValue: any;
  error: boolean;
} {
  const sVal = String(value);
  if (!schema) {
    // Assume it's a string if we don't have a binding. This is not likely to happen as long as components aren't
    // even rendered when their data model bindings fail.
    return { newValue: sVal, error: false };
  }

  if (schema.type === 'string') {
    return { newValue: sVal, error: false };
  }

  if (schema.type === 'number') {
    const parsed = asDecimal(sVal);
    return isNaN(parsed) ? { newValue: undefined, error: true } : { newValue: parsed, error: false };
  } else if (schema.type === 'integer') {
    const parsed = asInt32(sVal);
    return isNaN(parsed) ? { newValue: undefined, error: true } : { newValue: parsed, error: false };
  } else if (schema.type === 'boolean') {
    return sVal === 'true' || sVal === 'false'
      ? { newValue: sVal === 'true', error: false }
      : { newValue: undefined, error: true };
  }

  throw new Error(`Unsupported schema type: ${schema.type}`);
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
