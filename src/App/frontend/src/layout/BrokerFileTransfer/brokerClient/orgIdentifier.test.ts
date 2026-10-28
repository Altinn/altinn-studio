import { describe, expect, it } from 'vitest';

import {
  InvalidOrgNumberError,
  requireOrgIdentifier,
  toOrgIdentifier,
  toOrgNumber,
} from 'src/layout/BrokerFileTransfer/brokerClient/orgIdentifier';

describe('toOrgNumber', () => {
  it.each([
    ['912345678', '912345678'],
    ['912 345 678', '912345678'],
    ['0192:912345678', '912345678'],
    ['urn:altinn:organization:identifier-no:912345678', '912345678'],
  ])('reads %s', (value, expected) => {
    expect(toOrgNumber(value)).toBe(expected);
  });

  it.each(['', '91234567', '9123456789', '01017512345a', 'urn:altinn:person:identifier-no:01017512345'])(
    'rejects %s',
    (value) => {
      expect(toOrgNumber(value)).toBeNull();
    },
  );
});

describe('requireOrgIdentifier', () => {
  it('answers in the form the API validates against', () => {
    expect(requireOrgIdentifier('912 345 678')).toBe('0192:912345678');
    expect(toOrgIdentifier('912345678')).toBe('0192:912345678');
  });

  it('throws on anything that is not an organization number', () => {
    expect(() => requireOrgIdentifier('nope')).toThrow(InvalidOrgNumberError);
  });
});
