import { expressionToString } from './expressionToString';
import type { Expression } from '../types/Expression';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';

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
