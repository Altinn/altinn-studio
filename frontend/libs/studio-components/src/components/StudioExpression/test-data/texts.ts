import type { ExpressionTexts } from '../types/ExpressionTexts';
import { InstanceContext } from '../enums/InstanceContext';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { ExpressionErrorKey } from '../enums/ExpressionErrorKey';
import type { RelationalOperator } from '../types/RelationalOperator';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { SimpleSubexpressionValueType } from '../enums/SimpleSubexpressionValueType';
import { GatewayActionContext } from '../enums/GatewayActionContext';

const valueTypes: Record<SimpleSubexpressionValueType, string> = {
  [SimpleSubexpressionValueType.Boolean]: 'Boolean',
  [SimpleSubexpressionValueType.Component]: 'Component',
  [SimpleSubexpressionValueType.DataModel]: 'DataModel',
  [SimpleSubexpressionValueType.GatewayAction]: 'Gateway action',
  [SimpleSubexpressionValueType.GatewayActionContext]: 'Gateway action context',
  [SimpleSubexpressionValueType.InstanceContext]: 'Instance context',
  [SimpleSubexpressionValueType.Null]: 'Null',
  [SimpleSubexpressionValueType.Number]: 'Number',
  [SimpleSubexpressionValueType.String]: 'String',
};

const relationalOperators: Record<RelationalOperator, string> = {
  [GeneralRelationOperator.Equals]: 'equals',
  [GeneralRelationOperator.NotEquals]: 'is not equal to',
  [NumberRelationOperator.GreaterThan]: 'is greater than',
  [NumberRelationOperator.GreaterThanOrEq]: 'is greater than or equal to',
  [NumberRelationOperator.LessThan]: 'is less than',
  [NumberRelationOperator.LessThanOrEq]: 'is less than or equal to',
};

const logicalTupleOperators: Record<LogicalTupleOperator, string> = {
  [LogicalTupleOperator.And]: 'And',
  [LogicalTupleOperator.Or]: 'Or',
};

const gatewayActionContext: Record<GatewayActionContext, string> = {
  [GatewayActionContext.Confirm]: 'Confirm',
  [GatewayActionContext.Pay]: 'Pay',
  [GatewayActionContext.Sign]: 'Sign',
  [GatewayActionContext.Reject]: 'Reject',
};

const instanceContext: Record<InstanceContext, string> = {
  [InstanceContext.AppId]: 'App ID',
  [InstanceContext.InstanceId]: 'Instance ID',
  [InstanceContext.InstanceOwnerPartyId]: 'Instance owner party ID',
};

const errorMessages: Record<ExpressionErrorKey, string> = {
  [ExpressionErrorKey.InvalidComponentId]: 'The component ID is invalid. Choose one from the list.',
  [ExpressionErrorKey.InvalidDataModelPath]:
    'The data model path is invalid. Choose one from the list.',
  [ExpressionErrorKey.InvalidFirstOperand]: 'The first operand is invalid.',
  [ExpressionErrorKey.InvalidSecondOperand]: 'The second operand is invalid.',
  [ExpressionErrorKey.NumericRelationOperatorWithWrongType]:
    'The relational operator is invalid for the selected operand types.',
  [ExpressionErrorKey.ComponentIDNoLongerExists]: 'The component ID no longer exists.',
};

export const texts: ExpressionTexts = {
  addSubexpression: 'Add subexpression',
  and: 'and',
  andOr: 'and / or',
  cannotSimplify: 'The expression is not in a format that is supported by the simplified editor.',
  cannotSaveSinceInvalid: 'Cannot save since the expression is invalid.',
  changeToSimplifiedWarning:
    'The expression is not valid and will not be saved if you leave the tab. Are you sure you want to continue?',
  componentId: 'Component ID',
  confirmDeleteSubexpression: 'Are you sure you want to delete this subexpression?',
  dataModelPath: 'Data model path',
  delete: 'Delete',
  disabledLogicalOperator: 'There must be at least two subexpressions to use a logical operator.',
  edit: 'Edit',
  errorListFooter: 'Fix the errors and try again.',
  errorListHeader: 'The following errors were found:',
  errorMessages,
  expression: 'Expression',
  false: 'False',
  firstOperand: 'First operand',
  gatewayActionKey: 'Gateway action key',
  gatewayActionContext,
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
  readonlyDataModelPath: 'Data model path:',
  readonlyGatewayActionContext: 'Gateway action context:',
  readonlyInstanceContext: 'Instance context:',
  relationalOperator: 'Relational operator',
  relationalOperators,
  save: 'Save',
  saveAndClose: 'Save and close',
  secondOperand: 'Second operand',
  simplified: 'Simplified',
  subexpression: (index: number) => `Sub-expression number ${index + 1}`,
  transformToLogical: 'Transform to logical expression',
  true: 'True',
  value: 'Value',
  valueType: 'Type',
  valueTypes,
};
