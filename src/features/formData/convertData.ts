import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

interface ReturnType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
  error: boolean;
}

type Value = string | number | boolean | null | string[];
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

  if (Array.isArray(value)) {
    return { newValue: value, error: false };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AllValidTypes.includes(schema.type as any)
  ) {
    return convertToScalar(value, schema.type as ValidTypes, schema['@xsdType']);
  }

  throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
}

function convertToScalar(value: Value, targetType: ValidTypes, xsdType?: string): ReturnType {
  const sVal = String(value);
  if (targetType === 'string') {
    return { newValue: sVal, error: false };
  }

  if (targetType === 'number' || targetType === 'integer') {
    let parsed: number;
    if (xsdType === 'int') {
      parsed = asInt32(sVal);
    } else if (xsdType === 'long') {
      parsed = asInt64(sVal);
    } else if (xsdType === 'short') {
      parsed = asInt16(sVal);
    } else {
      parsed = asDecimal(sVal);
    }

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

function asNumber(value: string, type: 'float' | 'int', isValid: (n: number) => boolean): number {
  if (!value.length) {
    return NaN;
  }
  const trimmed = value.replace(/,/g, '').replace(/\s/g, '');
  if ((type === 'int' && !trimmed.match(/^-?\d+$/)) || (type === 'float' && !trimmed.match(/^-?\d+(\.\d+)?$/))) {
    return NaN;
  }
  const parsedValue = type === 'float' ? parseFloat(trimmed) : parseInt(trimmed, 10);
  if (isNaN(parsedValue) || !isFinite(parsedValue)) {
    return NaN;
  }

  if (!isValid(parsedValue)) {
    return NaN;
  }

  // The number type in JS is sneaky, because it cannot properly represent all numbers, and it will lie to you
  // about it by rounding them. By checking the string representation of the number, we can see if it was rounded
  // when parsed. If it was, we return NaN to indicate that the number is not valid and could not be parsed properly.
  // We don't know the importance of the precision, so instead of losing precision, we show validation errors.
  const toStr = parsedValue.toString();
  if (toStr !== trimmed) {
    // Remove leading zeros and check again (0001 === 1)
    const trimmedNoLeadingZeros = trimmed.replace(/^(-?)0+/, '$1');
    if (parsedValue.toString() === trimmedNoLeadingZeros) {
      return parsedValue;
    }
    // If the number is a decimal, try to remove trailing zeros (1.2000 === 1.2)
    const trimmedNoTrailingZeros = trimmed.replace(/(\.\d+?)0+$/, '$1');
    if (parsedValue.toString() === trimmedNoTrailingZeros) {
      return parsedValue;
    }
    return NaN;
  }

  return parsedValue;
}

/**
 * Checks if a string can be parsed to a decimal in C#.
 * 1. Empty string is not valid
 * 2. Value must be parsable as float in javascript
 * 3. Spaces will be removed, and commas will be replaced with dots
 * 4. Since the JS number type is a double, we can't check for overflow - so the number type bounds are used instead
 * @see https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types
 */
export function asDecimal(value: string): number {
  // We always indicate that this is valid as long as it's possible to parse it as a number. The limits for a decimal
  // type in C# are larger than the limits for a number in JS, so we can't check for overflow.
  return asNumber(value, 'float', () => true);
}

export function asInt32(value: string): number {
  return asNumber(value, 'int', (n) => n <= Math.pow(2, 31) - 1 && n >= -Math.pow(2, 31));
}

export function asInt64(value: string): number {
  return asNumber(value, 'int', (n) => n <= Number.MAX_SAFE_INTEGER && n >= Number.MIN_SAFE_INTEGER);
}

export function asInt16(value: string): number {
  return asNumber(value, 'int', (n) => n <= Math.pow(2, 15) - 1 && n >= -Math.pow(2, 15));
}
