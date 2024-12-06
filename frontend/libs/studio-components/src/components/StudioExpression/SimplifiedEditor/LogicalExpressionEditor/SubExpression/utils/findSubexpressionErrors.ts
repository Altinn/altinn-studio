import type { SimpleSubexpression } from '../../../../types/SimpleSubexpression';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import type { RelationalOperator } from '../../../../types/RelationalOperator';
import { SimpleSubexpressionValueType } from '../../../../enums/SimpleSubexpressionValueType';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import type { SimpleSubexpressionValue } from '../../../../types/SimpleSubexpressionValue';
import type { DataLookupOptions } from '../../../../types/DataLookupOptions';
import { DataLookupFuncName } from '../../../../enums/DataLookupFuncName';

export const findSubexpressionErrors = (
  subexpression: SimpleSubexpression,
  dataLookupOptions: Partial<DataLookupOptions>,
): ExpressionErrorKey[] => {
  const errors: ExpressionErrorKey[] = [];
  if (hasNumberOperator(subexpression) && hasBooleanValue(subexpression)) {
    errors.push(ExpressionErrorKey.NumericRelationOperatorWithWrongType);
  }
  if (!isOperandValid(subexpression.firstOperand, dataLookupOptions)) {
    errors.push(ExpressionErrorKey.InvalidFirstOperand);
  }
  if (!isOperandValid(subexpression.secondOperand, dataLookupOptions)) {
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

const isOperandValid = (
  value: SimpleSubexpressionValue,
  dataLookupOptions: Partial<DataLookupOptions>,
): boolean => {
  switch (value.type) {
    case SimpleSubexpressionValueType.DataModel:
      return isDataModelValueValid(value);
    case SimpleSubexpressionValueType.Component:
      return isComponentValueValid(value, dataLookupOptions);
    default:
      return true;
  }
};

const isDataModelValueValid = (
  value: SimpleSubexpressionValue<SimpleSubexpressionValueType.DataModel>,
): boolean => !!value.path;

const isComponentValueValid = (
  value: SimpleSubexpressionValue<SimpleSubexpressionValueType.Component>,
  dataLookupOptions: Partial<DataLookupOptions>,
): boolean => !!value.id && dataLookupOptions[DataLookupFuncName.Component]?.includes(value.id);
