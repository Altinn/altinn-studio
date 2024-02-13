import type { SimpleSubExpression } from '../../../../types/SimpleSubExpression';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import type { RelationalOperator } from '../../../../types/RelationalOperator';
import { SimpleSubExpressionValueType } from '../../../../enums/SimpleSubExpressionValueType';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import type { SimpleSubExpressionValue } from '../../../../types/SimpleSubExpressionValue';

export const findSubExpressionErrors = (
  subExpression: SimpleSubExpression,
): ExpressionErrorKey[] => {
  const errors: ExpressionErrorKey[] = [];
  if (hasNumberOperator(subExpression) && hasBooleanValue(subExpression)) {
    errors.push(ExpressionErrorKey.NumericRelationOperatorWithWrongType);
  }
  if (!isOperandValid(subExpression.firstOperand)) {
    errors.push(ExpressionErrorKey.InvalidFirstOperand);
  }
  if (!isOperandValid(subExpression.secondOperand)) {
    errors.push(ExpressionErrorKey.InvalidSecondOperand);
  }
  return errors;
};

const hasNumberOperator = (
  subExpression: SimpleSubExpression,
): subExpression is SimpleSubExpression<NumberRelationOperator> => {
  const numberOperators = Object.values(NumberRelationOperator) as RelationalOperator[];
  return numberOperators.includes(subExpression.relationalOperator);
};

const hasBooleanValue = ({ firstOperand, secondOperand }: SimpleSubExpression): boolean =>
  [firstOperand, secondOperand].some(
    (value) => value.type === SimpleSubExpressionValueType.Boolean,
  );

const isOperandValid = (value: SimpleSubExpressionValue): boolean => {
  switch (value.type) {
    case SimpleSubExpressionValueType.Datamodel:
      return isDatamodelValueValid(value);
    case SimpleSubExpressionValueType.Component:
      return isComponentValueValid(value);
    default:
      return true;
  }
};

const isDatamodelValueValid = (
  value: SimpleSubExpressionValue<SimpleSubExpressionValueType.Datamodel>,
): boolean => !!value.path;

const isComponentValueValid = (
  value: SimpleSubExpressionValue<SimpleSubExpressionValueType.Component>,
): boolean => !!value.id;
