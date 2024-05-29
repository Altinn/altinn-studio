import { findSubexpressionErrors } from './findSubexpressionErrors';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import { SimpleSubexpressionValueType } from '../../../../enums/SimpleSubexpressionValueType';
import type { SimpleSubexpression } from '../../../../types/SimpleSubexpression';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { GeneralRelationOperator } from '../../../../enums/GeneralRelationOperator';
import type { DataLookupOptions } from '../../../../types/DataLookupOptions';
import { DataLookupFuncName } from '../../../../enums/DataLookupFuncName';

describe('findSubexpressionErrors', () => {
  const dataLookupOptions: Partial<DataLookupOptions> = {
    [DataLookupFuncName.Component]: ['1', '2'],
    [DataLookupFuncName.DataModel]: ['a', 'b'],
  };
  it('Returns an empty array when the subexpression is valid', () => {
    const subexpression: SimpleSubexpression = {
      relationalOperator: GeneralRelationOperator.Equals,
      firstOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
      secondOperand: { type: SimpleSubexpressionValueType.Number, value: 2 },
    };
    const result = findSubexpressionErrors(subexpression, dataLookupOptions);
    expect(result).toEqual([]);
  });

  it('Returns an error key when the subexpression has a number operator and a boolean value', () => {
    const subexpression: SimpleSubexpression = {
      relationalOperator: NumberRelationOperator.GreaterThan,
      firstOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
      secondOperand: { type: SimpleSubexpressionValueType.Boolean, value: false },
    };

    const result = findSubexpressionErrors(subexpression, dataLookupOptions);
    expect(result).toEqual([ExpressionErrorKey.NumericRelationOperatorWithWrongType]);
  });

  it('Returns an error key when the subexpression has an empty data model path in the first value', () => {
    const subexpression: SimpleSubexpression = {
      relationalOperator: GeneralRelationOperator.Equals,
      firstOperand: { type: SimpleSubexpressionValueType.DataModel, path: '' },
      secondOperand: { type: SimpleSubexpressionValueType.Number, value: 2 },
    };
    const result = findSubexpressionErrors(subexpression, dataLookupOptions);
    expect(result).toEqual([ExpressionErrorKey.InvalidFirstOperand]);
  });

  it('Returns an error key when the subexpression has an empty component id in the first value', () => {
    const subexpression: SimpleSubexpression = {
      relationalOperator: GeneralRelationOperator.Equals,
      firstOperand: { type: SimpleSubexpressionValueType.Component, id: '' },
      secondOperand: { type: SimpleSubexpressionValueType.Number, value: 2 },
    };
    const result = findSubexpressionErrors(subexpression, dataLookupOptions);
    expect(result).toEqual([ExpressionErrorKey.InvalidFirstOperand]);
  });

  it('Returns an error key when the second value is invalid', () => {
    const subexpression: SimpleSubexpression = {
      relationalOperator: GeneralRelationOperator.Equals,
      firstOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
      secondOperand: { type: SimpleSubexpressionValueType.DataModel, path: '' },
    };
    const result = findSubexpressionErrors(subexpression, dataLookupOptions);
    expect(result).toEqual([ExpressionErrorKey.InvalidSecondOperand]);
  });

  it('Returns two error keys when both values are invalid', () => {
    const subexpression: SimpleSubexpression = {
      relationalOperator: GeneralRelationOperator.Equals,
      firstOperand: { type: SimpleSubexpressionValueType.Component, id: '' },
      secondOperand: { type: SimpleSubexpressionValueType.DataModel, path: '' },
    };
    const result = findSubexpressionErrors(subexpression, dataLookupOptions);
    expect(result).toEqual([
      ExpressionErrorKey.InvalidFirstOperand,
      ExpressionErrorKey.InvalidSecondOperand,
    ]);
  });
});
