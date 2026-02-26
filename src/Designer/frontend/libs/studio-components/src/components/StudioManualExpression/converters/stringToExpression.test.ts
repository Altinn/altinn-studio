import { stringToExpression } from './stringToExpression';
import { GeneralRelationOperator } from '../../StudioExpression/enums/GeneralRelationOperator';
import { DataLookupFuncName } from '../../StudioExpression/enums/DataLookupFuncName';

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
