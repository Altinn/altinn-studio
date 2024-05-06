import type { SimpleSubexpression } from '../../../../types/SimpleSubexpression';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import type { RelationalOperator } from '../../../../types/RelationalOperator';
import { SimpleSubexpressionValueType } from '../../../../enums/SimpleSubexpressionValueType';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import type { SimpleSubexpressionValue } from '../../../../types/SimpleSubexpressionValue';

export const findSubexpressionErrors = (
  subexpression: SimpleSubexpression,
  componentOptions?: string[],
): ExpressionErrorKey[] => {
  const errors: ExpressionErrorKey[] = [];
  if (hasNumberOperator(subexpression) && hasBooleanValue(subexpression)) {
    errors.push(ExpressionErrorKey.NumericRelationOperatorWithWrongType);
  }
  if (!isOperandValid(subexpression.firstOperand, componentOptions)) {
    errors.push(ExpressionErrorKey.InvalidFirstOperand);
  }
  if (!isOperandValid(subexpression.secondOperand, componentOptions)) {
    errors.push(ExpressionErrorKey.InvalidSecondOperand);
  }
  return errors;
};

const hasNumberOperator = (
  subexpression: SimpleSubexpression,
): subexpression is SimpleSubexpression<NumberRelationOperator> => {
  const numberOperators = Object.values(NumberRelationOperator) as RelationalOperator[];
  return numberOperators.includes(subexpression.relationalOperator);
};

const hasBooleanValue = ({ firstOperand, secondOperand }: SimpleSubexpression): boolean =>
  [firstOperand, secondOperand].some(
    (value) => value.type === SimpleSubexpressionValueType.Boolean,
  );

const isOperandValid = (value: SimpleSubexpressionValue, componentOptions: string[]): boolean => {
  switch (value.type) {
    case SimpleSubexpressionValueType.Datamodel:
      return isDatamodelValueValid(value);
    case SimpleSubexpressionValueType.Component:
      return isComponentValueValid(value, componentOptions);
    default:
      return true;
  }
};

const isDatamodelValueValid = (
  value: SimpleSubexpressionValue<SimpleSubexpressionValueType.Datamodel>,
): boolean => !!value.path;

const isComponentValueValid = (
  value: SimpleSubexpressionValue<SimpleSubexpressionValueType.Component>,
  componentOptions?: string[],
): boolean => {
  if (!componentOptions) {
    return !!value.id;
  }
  return !!value.id && componentOptions.includes(value.id);
};
