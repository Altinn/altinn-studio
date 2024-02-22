import type { ExpressionTexts } from '../types/ExpressionTexts';
import { InstanceContext } from '../enums/InstanceContext';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { ExpressionErrorKey } from '../enums/ExpressionErrorKey';
import type { RelationalOperator } from '../types/RelationalOperator';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { GenericRelationOperator } from '../enums/GenericRelationOperator';
import { SimpleSubExpressionValueType } from '../enums/SimpleSubExpressionValueType';

const valueTypes: Record<SimpleSubExpressionValueType, string> = {
  [SimpleSubExpressionValueType.Boolean]: 'Boolean',
  [SimpleSubExpressionValueType.Component]: 'Component',
  [SimpleSubExpressionValueType.Datamodel]: 'Datamodel',
  [SimpleSubExpressionValueType.InstanceContext]: 'Instance context',
  [SimpleSubExpressionValueType.Null]: 'Null',
  [SimpleSubExpressionValueType.Number]: 'Number',
  [SimpleSubExpressionValueType.String]: 'String',
};

const relationalOperators: Record<RelationalOperator, string> = {
  [GenericRelationOperator.Equals]: 'equals',
  [GenericRelationOperator.NotEquals]: 'is not equal to',
  [NumberRelationOperator.GreaterThan]: 'is greater than',
  [NumberRelationOperator.GreaterThanOrEq]: 'is greater than or equal to',
  [NumberRelationOperator.LessThan]: 'is less than',
  [NumberRelationOperator.LessThanOrEq]: 'is less than or equal to',
};

const logicalTupleOperators: Record<LogicalTupleOperator, string> = {
  [LogicalTupleOperator.And]: 'And',
  [LogicalTupleOperator.Or]: 'Or',
};

const instanceContext: Record<InstanceContext, string> = {
  [InstanceContext.AppId]: 'App ID',
  [InstanceContext.InstanceId]: 'Instance ID',
  [InstanceContext.InstanceOwnerPartyId]: 'Instance owner party ID',
};

const errorMessages: Record<ExpressionErrorKey, string> = {
  [ExpressionErrorKey.InvalidComponentId]: 'The component ID is invalid. Choose one from the list.',
  [ExpressionErrorKey.InvalidDatamodelPath]:
    'The data model path is invalid. Choose one from the list.',
  [ExpressionErrorKey.InvalidFirstOperand]: 'The first operand is invalid.',
  [ExpressionErrorKey.InvalidSecondOperand]: 'The second operand is invalid.',
  [ExpressionErrorKey.NumericRelationOperatorWithWrongType]:
    'The relational operator is invalid for the selected operand types.',
};

export const texts: ExpressionTexts = {
  addSubExpression: 'Add sub-expression',
  and: 'and',
  andOr: 'and / or',
  cannotSimplify: 'The expression is not in a format that is supported by the simplified editor.',
  cannotSaveSinceInvalid: 'Cannot save since the expression is invalid.',
  changeToSimplifiedWarning:
    'The expression is not valid and will not be saved if you leave the tab. Are you sure you want to continue?',
  componentId: 'Component ID',
  confirmDeleteSubExpression: 'Are you sure you want to delete this sub-expression?',
  datamodelPath: 'Datamodel path',
  delete: 'Delete',
  disabledLogicalOperator: 'There must be at least two sub-expressions to use a logical operator.',
  edit: 'Edit',
  errorListFooter: 'Fix the errors and try again.',
  errorListHeader: 'The following errors were found:',
  errorMessages,
  false: 'False',
  firstOperand: 'First operand',
  instanceContext,
  instanceContextKey: 'Instance context key',
  invalidExpression: 'Invalid expression',
  logicalOperation: 'Logical operation',
  logicalOperator: 'Logical operator',
  logicalTupleOperators,
  manual: 'Manual',
  numberValidationError: 'The value must be a number.',
  or: 'or',
  readonlyComponentId: 'Component ID:',
  readonlyDatamodelPath: 'Datamodel path:',
  readonlyInstanceContext: 'Instance context:',
  relationalOperator: 'Relational operator',
  relationalOperators,
  save: 'Save',
  saveAndClose: 'Save and close',
  secondOperand: 'Second operand',
  simplified: 'Simplified',
  subExpression: (index: number) => `Sub-expression number ${index + 1}`,
  transformToLogical: 'Transform to logical expression',
  true: 'True',
  value: 'Value',
  valueType: 'Type',
  valueTypes,
};
