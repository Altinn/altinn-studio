import { isStringValidAsExpression } from './isStringValidAsExpression';

describe('isStringValidAsExpression', () => {
  it('Returns true for a valid expression', () => {
    const input = '["equals", ["dataModel", "My.Model.Group.Field"], "string constant"]';
    const result = isStringValidAsExpression(input);
    expect(result).toBe(true);
  });

  it('Returns false for an invalid JSON syntax', () => {
    const input = '["equals", ';
    const result = isStringValidAsExpression(input);
    expect(result).toBe(false);
  });

  it('Returns false when the JSON syntax is valid, but the expression is not', () => {
    const input = '["invalidFunc", "something", "something else"]';
    const result = isStringValidAsExpression(input);
    expect(result).toBe(false);
  });
});
