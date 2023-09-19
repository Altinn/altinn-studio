import {
  DataSource,
  Expression,
  ExpressionFunction,
  ExpressionPropertyBase,
  Operator,
  SubExpression
} from '../types/Expressions';
import { component1Mock } from "./layoutMock";

export const componentId = component1Mock.id;
export const datamodelField = 'some-data-model-field';
export const stringValue = 'some-string-value';
export const numberValue = 1024;
export const nullValue = null;
export const booleanValue = true;
export const baseInternalSubExpression: SubExpression = {
  id: 'some-sub-exp-id',
  function: ExpressionFunction.Equals,
}
export const subExpression0: SubExpression = {
  id: 'some-sub-exp-id-0',
  function: ExpressionFunction.Equals,
  dataSource: DataSource.Component,
  value: componentId,
  comparableDataSource: DataSource.String,
  comparableValue: stringValue,
}
export const subExpression1: SubExpression = {
  id: 'some-sub-exp-id-1',
  function: ExpressionFunction.Equals,
  dataSource: DataSource.Null,
  value: nullValue,
  comparableDataSource: DataSource.Number,
  comparableValue: numberValue,
}
export const subExpression2: SubExpression = {
  id: 'some-sub-exp-id-2',
  function: ExpressionFunction.Equals,
  dataSource: DataSource.Boolean,
  value: booleanValue,
  comparableDataSource: DataSource.Component,
  comparableValue: componentId,
}
export const baseInternalExpression: Expression = {
  id: 'some-id-0',
  property: ExpressionPropertyBase.Hidden,
  subExpressions: [
    baseInternalSubExpression
  ]
}
export const simpleInternalExpression: Expression = {
  id: 'some-id-1',
  property: ExpressionPropertyBase.Hidden,
  subExpressions: [
    subExpression0
  ]
};
export const internalExpressionWithMultipleSubExpressions: Expression = {
  id: 'some-id-2',
  property: ExpressionPropertyBase.Hidden,
  operator: Operator.Or,
  subExpressions: [
    subExpression1,
    subExpression2
  ]
};
export const equivalentExternalExpressionWithMultipleSubExpressions = [
  'or', [
    'equals',
    nullValue,
    numberValue
  ],
  [
    'equals',
    booleanValue,
    [
      DataSource.Component,
      componentId
    ]
  ]
]
export const parsableExternalExpression = [
  'and',
  [
    'equals',
    stringValue,
    nullValue
  ],
  [
    'equals',
    numberValue,
    booleanValue
  ],
  [
    'not',
    [
      DataSource.Component,
      componentId
    ],
    [
      DataSource.DataModel,
      datamodelField
    ]
  ]
];
export const unParsableComplexExpression = '["equals, [datamodel, test, true]';
export const parsableComplexExpression = '["equals", ["datamodel", "test"], true]';
export const parsableNotStudioFriendlyComplexExpression = ["dataModel", "some-field"];
export const parsableNotStudioFriendlyLongComplexExpression = ["and",
  ["equals", ["equals", ["dataModel", "some-field"], "true"], "true"],
  ["equals", ["dataModel", "some-field"], "true"]
];
export const internalUnParsableComplexExpression: Expression = {
  id: 'some-id-4',
  property: ExpressionPropertyBase.Hidden,
  complexExpression: unParsableComplexExpression,
}
export const internalParsableComplexExpression: Expression = {
  id: 'some-id-5',
  property: ExpressionPropertyBase.Hidden,
  complexExpression: parsableExternalExpression,
}
