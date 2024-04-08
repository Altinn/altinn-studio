import type { Expression, SubExpression } from '../types/Expressions';
import {
  DataSource,
  ExpressionFunction,
  ExpressionPropertyBase,
  Operator,
} from '../types/Expressions';
import { component1Mock } from './layoutMock';

export const componentId = component1Mock.id;
export const datamodelField = 'some-data-model-field';
export const stringValue = 'some-string-value';
export const numberValue = 1024;
export const nullValue = null;
export const booleanValue = true;
export const baseInternalSubExpression: SubExpression = {
  function: ExpressionFunction.Equals,
};
export const subExpression0: SubExpression = {
  function: ExpressionFunction.Equals,
  dataSource: DataSource.Component,
  value: componentId,
  comparableDataSource: DataSource.String,
  comparableValue: stringValue,
};
export const subExpression1: SubExpression = {
  function: ExpressionFunction.Equals,
  dataSource: DataSource.Null,
  value: nullValue,
  comparableDataSource: DataSource.Number,
  comparableValue: numberValue,
};
export const subExpression2: SubExpression = {
  function: ExpressionFunction.Equals,
  dataSource: DataSource.Boolean,
  value: booleanValue,
  comparableDataSource: DataSource.Component,
  comparableValue: componentId,
};
export const baseInternalExpression: Expression = {
  property: ExpressionPropertyBase.Hidden,
  subExpressions: [baseInternalSubExpression],
};
export const simpleInternalExpression: Expression = {
  property: ExpressionPropertyBase.Hidden,
  subExpressions: [subExpression0],
};
export const internalExpressionWithMultipleSubExpressions: Expression = {
  property: ExpressionPropertyBase.Hidden,
  operator: Operator.Or,
  subExpressions: [subExpression1, subExpression2],
};
export const equivalentExternalExpressionWithMultipleSubExpressions = [
  'or',
  ['equals', nullValue, numberValue],
  ['equals', booleanValue, [DataSource.Component, componentId]],
];
export const parsableExternalExpression: any = [
  'and',
  ['equals', stringValue, nullValue],
  ['equals', numberValue, booleanValue],
  ['not', [DataSource.Component, componentId], [DataSource.DataModel, datamodelField]],
];
export const unParsableComplexExpression = '["equals, [datamodel, test, true]';
export const parsableComplexExpression = '["equals", ["datamodel", "test"], true]';
export const parsableNotStudioFriendlyComplexExpression: any = ['dataModel', 'some-field'];
export const parsableNotStudioFriendlyLongComplexExpression: any = [
  'and',
  ['equals', ['equals', ['dataModel', 'some-field'], 'true'], 'true'],
  ['equals', ['dataModel', 'some-field'], 'true'],
];
export const internalUnParsableComplexExpression: Expression = {
  property: ExpressionPropertyBase.Hidden,
  complexExpression: unParsableComplexExpression,
};
export const internalParsableComplexExpression: Expression = {
  property: ExpressionPropertyBase.Hidden,
  complexExpression: parsableExternalExpression,
};
