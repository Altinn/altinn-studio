const NORWEGIAN_ORG_CODE = '0192';

const IDENTIFIER_PREFIXES = ['urn:altinn:organization:identifier-no:', `${NORWEGIAN_ORG_CODE}:`];

export function toOrgNumber(value: string): string | null {
  let rest = value.trim();
  const prefix = IDENTIFIER_PREFIXES.find((candidate) => rest.toLowerCase().startsWith(candidate));
  if (prefix) {
    rest = rest.slice(prefix.length);
  }

  const digits = rest.replace(/\s/g, '');
  return /^\d{9}$/.test(digits) ? digits : null;
}

export function requireOrgIdentifier(orgNumber: string): string {
  const identifier = toOrgIdentifier(orgNumber);
  if (!identifier) {
    throw new InvalidOrgNumberError(orgNumber);
  }
  return identifier;
}

export function toOrgIdentifier(orgNumber: string): string | null {
  const digits = toOrgNumber(orgNumber);
  return digits ? `${NORWEGIAN_ORG_CODE}:${digits}` : null;
}

export class InvalidOrgNumberError extends Error {
  public readonly value: string;

  constructor(value: string) {
    super(`Invalid organization number: ${value}`);
    this.name = 'InvalidOrgNumberError';
    this.value = value;
  }
}
