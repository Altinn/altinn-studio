import { findSubExpressionErrors } from './findSubExpressionErrors';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import { SimpleSubExpressionValueType } from '../../../../enums/SimpleSubExpressionValueType';
import type { SimpleSubExpression } from '../../../../types/SimpleSubExpression';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { GenericRelationOperator } from '../../../../enums/GenericRelationOperator';

describe('findSubExpressionErrors', () => {
  it('Returns an empty array when the subexpression is valid', () => {
    const subExpression: SimpleSubExpression = {
      relationalOperator: GenericRelationOperator.Equals,
      firstOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
      secondOperand: { type: SimpleSubExpressionValueType.Number, value: 2 },
    };
    const result = findSubExpressionErrors(subExpression);
    expect(result).toEqual([]);
  });

  it('Returns an error key when the subexpression has a number operator and a boolean value', () => {
    const subExpression: SimpleSubExpression = {
      relationalOperator: NumberRelationOperator.GreaterThan,
      firstOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
      secondOperand: { type: SimpleSubExpressionValueType.Boolean, value: false },
    };
    const result = findSubExpressionErrors(subExpression);
    expect(result).toEqual([ExpressionErrorKey.NumericRelationOperatorWithWrongType]);
  });

  it('Returns an error key when the subexpression has an empty datamodel path in the first value', () => {
    const subExpression: SimpleSubExpression = {
      relationalOperator: GenericRelationOperator.Equals,
      firstOperand: { type: SimpleSubExpressionValueType.Datamodel, path: '' },
      secondOperand: { type: SimpleSubExpressionValueType.Number, value: 2 },
    };
    const result = findSubExpressionErrors(subExpression);
    expect(result).toEqual([ExpressionErrorKey.InvalidFirstOperand]);
  });

  it('Returns an error key when the subexpression has an empty component id in the first value', () => {
    const subExpression: SimpleSubExpression = {
      relationalOperator: GenericRelationOperator.Equals,
      firstOperand: { type: SimpleSubExpressionValueType.Component, id: '' },
      secondOperand: { type: SimpleSubExpressionValueType.Number, value: 2 },
    };
    const result = findSubExpressionErrors(subExpression);
    expect(result).toEqual([ExpressionErrorKey.InvalidFirstOperand]);
  });

  it('Returns an error key when the second value is invalid', () => {
    const subExpression: SimpleSubExpression = {
      relationalOperator: GenericRelationOperator.Equals,
      firstOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
      secondOperand: { type: SimpleSubExpressionValueType.Datamodel, path: '' },
    };
    const result = findSubExpressionErrors(subExpression);
    expect(result).toEqual([ExpressionErrorKey.InvalidSecondOperand]);
  });

  it('Returns two error keys when both values are invalid', () => {
    const subExpression: SimpleSubExpression = {
      relationalOperator: GenericRelationOperator.Equals,
      firstOperand: { type: SimpleSubExpressionValueType.Component, id: '' },
      secondOperand: { type: SimpleSubExpressionValueType.Datamodel, path: '' },
    };
    const result = findSubExpressionErrors(subExpression);
    expect(result).toEqual([
      ExpressionErrorKey.InvalidFirstOperand,
      ExpressionErrorKey.InvalidSecondOperand,
    ]);
  });
});
