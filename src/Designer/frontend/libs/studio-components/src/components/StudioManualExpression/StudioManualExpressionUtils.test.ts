import { stringToExpression, expressionToString } from './StudioManualExpressionUtils';
import { GeneralRelationOperator } from '../StudioExpression/enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../StudioExpression/enums/DataLookupFuncName';
import type { Expression } from '../StudioExpression';

describe('stringToExpression', () => {
  it('Converts a string to an expression', () => {
    const input = '["equals", ["dataModel", "My.Model.Group.Field"], "string constant"]';
    const expectedResult = [
      GeneralRelationOperator.Equals,
      [DataLookupFuncName.DataModel, 'My.Model.Group.Field'],
      'string constant',
    ];
    const result = stringToExpression(input);
    expect(result).toEqual(expectedResult);
  });
});

describe('expressionToString', () => {
  it('Converts an expression object to a string', () => {
    const expression: Expression = [
      GeneralRelationOperator.Equals,
      [DataLookupFuncName.DataModel, 'My.Model.Group.Field'],
      'string constant',
    ];
    const expectedResult =
      /\[\s*"equals",\s*\[\s*"dataModel",\s*"My.Model.Group.Field"\s*],\s*"string constant"\s*]/;
    const result = expressionToString(expression);
    expect(result).toMatch(expectedResult);
  });
});
