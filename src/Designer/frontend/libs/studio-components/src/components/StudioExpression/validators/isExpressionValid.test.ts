import type { DataLookupFunc, Expression } from '../types/Expression';
import { isExpressionValid } from './isExpressionValid';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';

describe('isExpressionValid', () => {
  it('Returns true when expression is valid', () => {
    const equalsExpression: Expression = [
      GeneralRelationOperator.Equals,
      [DataLookupFuncName.DataModel, 'someField'],
      'someValue',
    ];
    const ifExpression: Expression = ['if', [DataLookupFuncName.DataModel, 'test'], 'return'];
    const andExpression: Expression = [LogicalTupleOperator.And, equalsExpression, ifExpression];
    const validExpressions: Expression[] = [
      true,
      false,
      null,
      equalsExpression,
      ifExpression,
      andExpression,
    ];
    validExpressions.forEach((validExpression) => {
      expect(isExpressionValid(validExpression)).toBe(true);
    });
  });

  it('Returns true when a list argument is looked up from the data model', () => {
    // The evaluators accept any expression returning a list where a list is expected, so the editor must let the
    // user save it. Typed as unknown because the Expression type does not cover the count function yet.
    const countExpression: unknown = [
      GeneralRelationOperator.Equals,
      2,
      ['count', [DataLookupFuncName.DataModel, 'someList']],
    ];
    expect(isExpressionValid(countExpression)).toBe(true);
  });

  it('Returns false when expression is invalid', () => {
    const invalidFunction = ['invalidFunction', 'test'];
    const validFunction: DataLookupFunc = [DataLookupFuncName.DataModel, 'test'];
    const invalidExpressions: unknown[] = [
      invalidFunction,
      [GeneralRelationOperator.Equals, invalidFunction],
      [LogicalTupleOperator.And, [validFunction, invalidFunction]],
    ];
    invalidExpressions.forEach((invalidExpression) => {
      expect(isExpressionValid(invalidExpression)).toBe(false);
    });
  });
});
