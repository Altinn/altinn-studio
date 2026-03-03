import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

interface ConvertResult {
  value: string | number | boolean | null | undefined;
  error: boolean;
}

const VALID_TYPES = ['string', 'number', 'integer', 'boolean', 'null'] as const;
type ValidType = (typeof VALID_TYPES)[number];

/**
 * Converts a value to the correct type based on a JSON Schema node.
 * Returns { value, error } where error=true means the value couldn't be converted.
 */
export function convertData(value: string | number | boolean | null, schema: JSONSchema7 | undefined): ConvertResult {
  if (!schema) {
    return { value: String(value), error: false };
  }

  return convertToType(value, schema);
}

function convertToType(
  value: string | number | boolean | null,
  schema: JSONSchema7 | JSONSchema7Definition,
): ConvertResult {
  if (typeof schema === 'boolean') {
    return { value: undefined, error: true };
  }

  if (schema.anyOf) {
    for (const sub of schema.anyOf) {
      const result = convertToType(value, sub);
      if (!result.error) {
        return result;
      }
    }
    return { value: undefined, error: true };
  }

  if (schema.oneOf) {
    const valid = schema.oneOf.map((sub) => convertToType(value, sub)).filter((r) => !r.error);
    return valid.length === 1 ? valid[0] : { value: undefined, error: true };
  }

  if (schema.type && typeof schema.type === 'string' && (VALID_TYPES as readonly string[]).includes(schema.type)) {
    return convertToScalar(
      value,
      schema.type as ValidType,
      schema['@xsdType' as keyof JSONSchema7] as string | undefined,
    );
  }

  return { value: undefined, error: true };
}

function convertToScalar(
  value: string | number | boolean | null,
  targetType: ValidType,
  xsdType?: string,
): ConvertResult {
  const sVal = String(value);

  if (targetType === 'string') {
    return { value: sVal, error: false };
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
    return isNaN(parsed) ? { value: undefined, error: true } : { value: parsed, error: false };
  }

  if (targetType === 'boolean') {
    if (sVal === 'true') {
      return { value: true, error: false };
    }
    if (sVal === 'false') {
      return { value: false, error: false };
    }
    return { value: undefined, error: true };
  }

  // null type
  if (sVal === 'null' || sVal === '') {
    return { value: null, error: false };
  }
  return { value: undefined, error: true };
}

function asNumber(value: string, type: 'float' | 'int', isValid: (n: number) => boolean): number {
  if (!value.length) {
    return NaN;
  }
  const trimmed = value.replace(/,/g, '').replace(/\s/g, '');
  if ((type === 'int' && !trimmed.match(/^-?\d+$/)) || (type === 'float' && !trimmed.match(/^-?\d+(\.\d+)?$/))) {
    return NaN;
  }
  const parsed = type === 'float' ? parseFloat(trimmed) : parseInt(trimmed, 10);
  if (isNaN(parsed) || !isFinite(parsed) || !isValid(parsed)) {
    return NaN;
  }

  // Check that JS didn't silently round the number
  const toStr = parsed.toString();
  if (toStr !== trimmed) {
    const noLeadingZeros = trimmed.replace(/^(-?)0+/, '$1');
    if (toStr === noLeadingZeros) {
      return parsed;
    }
    const noTrailingZeros = trimmed.replace(/(\.\d+?)0+$/, '$1');
    if (toStr === noTrailingZeros) {
      return parsed;
    }
    const noDecimalZeros = trimmed.replace(/\.0+$/, '');
    if (toStr === noDecimalZeros) {
      return parsed;
    }
    return NaN;
  }

  return parsed;
}

function asDecimal(value: string): number {
  return asNumber(value, 'float', () => true);
}

function asInt32(value: string): number {
  return asNumber(value, 'int', (n) => n <= 2147483647 && n >= -2147483648);
}

function asInt64(value: string): number {
  return asNumber(value, 'int', (n) => n <= Number.MAX_SAFE_INTEGER && n >= Number.MIN_SAFE_INTEGER);
}

function asInt16(value: string): number {
  return asNumber(value, 'int', (n) => n <= 32767 && n >= -32768);
}
