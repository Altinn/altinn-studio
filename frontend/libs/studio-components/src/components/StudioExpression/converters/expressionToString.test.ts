import { expressionToString } from './expressionToString';
import type { Expression } from '../types/Expression';
import { GenericRelationOperator } from '../enums/GenericRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';

describe('expressionToString', () => {
  it('Converts an expression object to a string', () => {
    const expression: Expression = [
      GenericRelationOperator.Equals,
      [DataLookupFuncName.DataModel, 'My.Model.Group.Field'],
      'string constant',
    ];
    const expectedResult =
      /\[\s*"equals",\s*\[\s*"dataModel",\s*"My.Model.Group.Field"\s*],\s*"string constant"\s*]/;
    const result = expressionToString(expression);
    expect(result).toMatch(expectedResult);
  });
});
