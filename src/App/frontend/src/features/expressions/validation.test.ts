import { jest } from '@jest/globals';

import { getSharedTests } from 'src/features/expressions/shared';
import { assertValidValue, ExprValidation } from 'src/features/expressions/validation';

describe('Expression validation', () => {
  let originalLogError: typeof window.logError;

  beforeEach(() => {
    originalLogError = window.logError;
    window.logError = jest.fn();
  });

  afterEach(() => {
    window.logError = originalLogError;
  });

  describe('Shared tests for invalid expressions', () => {
    const invalidSharedTests = getSharedTests('invalid');
    it.each(invalidSharedTests.content)('$name', (invalid) => {
      expect(() => ExprValidation.throwIfInvalid(invalid.expression)).toThrow(invalid.expectsFailure);
    });
  });

  describe('Some values/objects should not validate', () => {
    it.each([
      '',
      null,
      false,
      undefined,
      5,
      new Date(),
      {},
      { hello: 'world' },
      { expr: 'hello world' },
      { expr: '5 == 5', and: 'other property' },
    ])('should validate %p as an invalid expression (non-throwing)', (maybeExpr) => {
      expect(ExprValidation.throwIfInvalid(maybeExpr)).toBeUndefined();
    });
  });

  describe('assertValidValue', () => {
    it('Throws an error when the value is not valid', () => {
      expect(() => assertValidValue(BigInt(1))).toThrow('Invalid expression value.');
    });

    it('Accepts valid values', () => {
      expect(() => assertValidValue(1)).not.toThrow();
    });
  });
});
