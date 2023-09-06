import {
  DataSource,
  Expression,
  ExpressionFunction,
  ExpressionPropertyBase,
  Operator,
  SubExpression
} from '../types/Expressions';
import {
  addProperty,
  addExpressionIfLimitNotReached,
  convertAndAddExpressionToComponent,
  convertExternalExpressionToInternal,
  convertInternalExpressionToExternal,
  convertSubExpression,
  deleteExpressionAndAddDefaultIfEmpty,
  removeInvalidExpressions,
  removeSubExpressionAndAdaptParentProps,
} from './expressionsUtils';
import { component1IdMock, component1Mock } from '../testing/layoutMock';
import { deepCopy } from "app-shared/pure";

describe('expressionsUtils', () => {
  const componentId = 'some-component-id';
  const datamodelField = 'some-data-model-field';
  const stringValue = 'some-string-value';
  const numberValue = 1024;
  const nullValue = null;
  const booleanValue = true;
  const baseInternalSubExpression: SubExpression = {
    id: 'some-sub-exp-id',
    function: ExpressionFunction.Equals,
  }
  const subExpression0: SubExpression = {
    id: 'some-sub-exp-id-0',
    function: ExpressionFunction.Equals,
    dataSource: DataSource.Component,
    value: componentId,
    comparableDataSource: DataSource.String,
    comparableValue: stringValue,
  }
  const subExpression1: SubExpression = {
    id: 'some-sub-exp-id-1',
    function: ExpressionFunction.Equals,
    dataSource: DataSource.Null,
    value: nullValue,
    comparableDataSource: DataSource.Number,
    comparableValue: numberValue,
  }
  const subExpression2: SubExpression = {
    id: 'some-sub-exp-id-2',
    function: ExpressionFunction.Equals,
    dataSource: DataSource.Boolean,
    value: booleanValue,
    comparableDataSource: DataSource.Component,
    comparableValue: componentId,
  }
  const baseInternalExpression: Expression = {
    id: 'some-id-0',
    property: ExpressionPropertyBase.Hidden,
    subExpressions: [
      baseInternalSubExpression
    ]
  }
  const simpleInternalExpression: Expression = {
    id: 'some-id-1',
    property: ExpressionPropertyBase.Hidden,
    subExpressions: [
      subExpression0
    ]
  };
  const internalExpressionWithMultipleSubExpressions: Expression = {
    id: 'some-id-2',
    property: ExpressionPropertyBase.Hidden,
    operator: Operator.Or,
    subExpressions: [
      subExpression1,
      subExpression2
    ]
  };
  const equivalentExternalExpressionWithMultipleSubExpressions = [
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
  const parsableExternalExpression = [
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
  const unParsableComplexExpression = '["equals, [datamodel, test, true]';
  const parsableNotStudioFriendlyComplexExpression = ["dataModel", "some-field"];
  const parsableNotStudioFriendlyLongComplexExpression = ["and",
    ["equals", ["equals", ["dataModel", "some-field"], "true"], "true"],
    ["equals", ["dataModel", "some-field"], "true"]
  ];
  const internalUnParsableComplexExpression: Expression = {
    id: 'some-id-4',
    property: ExpressionPropertyBase.Hidden,
    complexExpression: unParsableComplexExpression,
  }
  const internalParsableComplexExpression: Expression = {
    id: 'some-id-5',
    property: ExpressionPropertyBase.Hidden,
    complexExpression: parsableExternalExpression,
  }

  describe('convertSubExpression', () => {
    it('converts first part of external subexpression in array format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const extSubExpression: any = ['component', 'test-comp'];
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Component);
      expect(convertedSubExpression.value).toBe(extSubExpression[1]);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in array format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const extSubExpression: any = ['component', 'test-comp'];
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Component);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression[1]);
    });
    it('converts first part of external subexpression in string format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const extSubExpression: any = 'test-string';
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.String);
      expect(convertedSubExpression.value).toBe(extSubExpression);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in string format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const extSubExpression: any = 'test-string';
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.String);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression);
    });
    it('converts first part of external subexpression in number format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const extSubExpression: any = 1024;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Number);
      expect(convertedSubExpression.value).toBe(extSubExpression);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in number format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const extSubExpression: any = 1024;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Number);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression);
    });
    it('converts first part of external subexpression as null to internal subexpression where dataSource is set', () => {
      const extSubExpression: any = null;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Null);
      expect(convertedSubExpression.value).toBe(null);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression as null to internal subexpression where compDataSource is set', () => {
      const extSubExpression: any = null;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Null);
      expect(convertedSubExpression.comparableValue).toBe(null);
    });
    it('converts first part of external subexpression as boolean to internal subexpression where dataSource and dataSourceValue are set', () => {
      const extSubExpression: any = true;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Boolean);
      expect(convertedSubExpression.value).toBe(extSubExpression);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression as boolean to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const extSubExpression: any = true;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Boolean);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression);
    });
  });
  describe('convertInternalExpressionToExternal', () => {
    it('converts internal expression with one subExpression', () => {
      const externalExpression = convertInternalExpressionToExternal(simpleInternalExpression);

      expect(externalExpression).toBeInstanceOf(Array);
      expect(externalExpression.length).toBe(3);
      expect(externalExpression[0]).toBe(ExpressionFunction.Equals);
      expect(externalExpression[1]).toBeInstanceOf(Array);
      expect(externalExpression[1][0]).toBe(DataSource.Component);
      expect(externalExpression[1][1]).toBe(componentId);
      expect(typeof externalExpression[2]).toBe('string');
      expect(externalExpression[2]).toBe(stringValue);
    });
    it('converts internal expression with multiple subExpressions and boolean-, null- and number-usage.', () => {
      const externalExpression = convertInternalExpressionToExternal(internalExpressionWithMultipleSubExpressions);

      expect(externalExpression).toBeInstanceOf(Array);
      expect(externalExpression.length).toBe(3);
      expect(externalExpression[0]).toBe(Operator.Or);
      expect(externalExpression[1]).toBeInstanceOf(Array);
      expect(externalExpression[2]).toBeInstanceOf(Array);
      expect(externalExpression[1].length).toBe(3);
      expect(externalExpression[2].length).toBe(3);
      expect(externalExpression[1][0]).toBe(ExpressionFunction.Equals);
      expect(externalExpression[1][1]).toBe(nullValue);
      expect(externalExpression[1][2]).toBe(numberValue);
      expect(externalExpression[2][0]).toBe(ExpressionFunction.Equals);
      expect(externalExpression[2][1]).toBe(booleanValue);
      expect(externalExpression[2][2]).toBeInstanceOf(Array);
      expect(externalExpression[2][2][0]).toBe(DataSource.Component);
      expect(externalExpression[2][2][1]).toBe(componentId);
    });
    it('converts most basic valid internal expression', () => {
      const externalExpression = convertInternalExpressionToExternal(baseInternalExpression);

      expect(externalExpression).toBeInstanceOf(Array);
      expect(externalExpression[0]).toBe(ExpressionFunction.Equals);
      expect(externalExpression[1]).toBe(nullValue);
      expect(externalExpression[2]).toBe(nullValue);
    });
    it('converts un-parsable internal complex expression to plain string', () => {
      const externalExpression = convertInternalExpressionToExternal(internalUnParsableComplexExpression);

      expect(typeof externalExpression).toBe('string');
      expect(externalExpression).toBe(unParsableComplexExpression);
    });
  });
  describe('convertExternalExpressionToInternal', () => {
    it('converts expression with one subExpression where first part is array and second null to valid internal expression', () => {
      const externalExpression = [
        'equals',
        [
          'component',
          componentId
        ],
        nullValue
      ];
      const internalExpression = convertExternalExpressionToInternal(ExpressionPropertyBase.Hidden, externalExpression);

      expect(internalExpression.complexExpression).toBe(undefined);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.subExpressions.length).toBe(1);
      expect(internalExpression.subExpressions[0].function).toBe(ExpressionFunction.Equals);
      expect(internalExpression.subExpressions[0].dataSource).toBe(DataSource.Component);
      expect(internalExpression.subExpressions[0].value).toBe(componentId);
      expect(internalExpression.subExpressions[0].comparableDataSource).toBe(DataSource.Null);
      expect(internalExpression.subExpressions[0].comparableValue).toBe(nullValue);
    });
    it('converts expression with one subExpression where first part is string and second number to valid internal expression', () => {
      const externalExpression = [
        'equals',
        stringValue,
        numberValue
      ];
      const internalExpression = convertExternalExpressionToInternal(ExpressionPropertyBase.Hidden, externalExpression);

      expect(internalExpression.complexExpression).toBe(undefined);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.subExpressions.length).toBe(1);
      expect(internalExpression.subExpressions[0].function).toBe(ExpressionFunction.Equals);
      expect(internalExpression.subExpressions[0].dataSource).toBe(DataSource.String);
      expect(internalExpression.subExpressions[0].value).toBe(stringValue);
      expect(internalExpression.subExpressions[0].comparableDataSource).toBe(DataSource.Number);
      expect(internalExpression.subExpressions[0].comparableValue).toBe(numberValue);
    });
    it('converts expression with one subExpression where both parts are null number to valid internal expression', () => {
      const externalExpression = [
        'equals',
        nullValue,
        nullValue
      ];
      const internalExpression = convertExternalExpressionToInternal(ExpressionPropertyBase.Hidden, externalExpression);

      expect(internalExpression.complexExpression).toBe(undefined);
      expect(internalExpression.operator).toBe(undefined);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.subExpressions.length).toBe(1);
      expect(internalExpression.subExpressions[0].function).toBe(ExpressionFunction.Equals);
      expect(internalExpression.subExpressions[0].dataSource).toBe(DataSource.Null);
      expect(internalExpression.subExpressions[0].value).toBe(nullValue);
      expect(internalExpression.subExpressions[0].comparableDataSource).toBe(DataSource.Null);
      expect(internalExpression.subExpressions[0].comparableValue).toBe(nullValue);
    });
    it('converts expression with multiple subExpressions to valid internal expression', () => {
      const internalExpression = convertExternalExpressionToInternal(ExpressionPropertyBase.Hidden, parsableExternalExpression);

      expect(internalExpression.complexExpression).toBe(undefined);
      expect(internalExpression.operator).toBe(Operator.And);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.subExpressions.length).toBe(3);
      expect(internalExpression.subExpressions[0].function).toBe(ExpressionFunction.Equals);
      expect(internalExpression.subExpressions[0].dataSource).toBe(DataSource.String);
      expect(internalExpression.subExpressions[0].value).toBe(stringValue);
      expect(internalExpression.subExpressions[0].comparableDataSource).toBe(DataSource.Null);
      expect(internalExpression.subExpressions[0].comparableValue).toBe(nullValue);
      expect(internalExpression.subExpressions[1].function).toBe(ExpressionFunction.Equals);
      expect(internalExpression.subExpressions[1].dataSource).toBe(DataSource.Number);
      expect(internalExpression.subExpressions[1].value).toBe(numberValue);
      expect(internalExpression.subExpressions[1].comparableDataSource).toBe(DataSource.Boolean);
      expect(internalExpression.subExpressions[1].comparableValue).toBe(booleanValue);
      expect(internalExpression.subExpressions[2].function).toBe(ExpressionFunction.Not);
      expect(internalExpression.subExpressions[2].dataSource).toBe(DataSource.Component);
      expect(internalExpression.subExpressions[2].value).toBe(componentId);
      expect(internalExpression.subExpressions[2].comparableDataSource).toBe(DataSource.DataModel);
      expect(internalExpression.subExpressions[2].comparableValue).toBe(datamodelField);
    });
    it('converts non-studio-friendly expression to internal complex expression', () => {
      const internalExpression = convertExternalExpressionToInternal(ExpressionPropertyBase.Hidden, parsableNotStudioFriendlyComplexExpression);

      expect(internalExpression.complexExpression).toBe(parsableNotStudioFriendlyComplexExpression);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.operator).toBe(undefined);
      expect(internalExpression.subExpressions).toBe(undefined);
    });
    it('converts expression with multiple nested subExpressions to internal complex expression', () => {
      const internalExpression = convertExternalExpressionToInternal(ExpressionPropertyBase.Hidden, parsableNotStudioFriendlyLongComplexExpression);

      expect(internalExpression.complexExpression).toBe(parsableNotStudioFriendlyLongComplexExpression);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.operator).toBe(undefined);
      expect(internalExpression.subExpressions).toBe(undefined);
    });
  });
  describe('convertAndAddExpressionToComponent', () => {
    it('converted expression is set on form component hidden property', async () => {
      const updatedComponent = convertAndAddExpressionToComponent(component1Mock, component1IdMock, internalExpressionWithMultipleSubExpressions);

      expect(updatedComponent.hidden).toStrictEqual(equivalentExternalExpressionWithMultipleSubExpressions);
    });
    it('converted and parsed complex expression is set as array on form component hidden property', () => {
      const updatedComponent = convertAndAddExpressionToComponent(component1Mock, component1IdMock, internalParsableComplexExpression);

      expect(updatedComponent.hidden).toStrictEqual(parsableExternalExpression);
      expect(updatedComponent.hidden).toBeInstanceOf(Array);
    });
    it('converted complex expression is set as string on form component hidden property', () => {
      const updatedComponent = convertAndAddExpressionToComponent(component1Mock, component1IdMock, internalUnParsableComplexExpression);

      expect(updatedComponent.hidden).toStrictEqual(unParsableComplexExpression);
      expect(typeof updatedComponent.hidden).toBe('string');
    });
  });
  describe('addExpressionIfLimitNotReached', () => {
    it('should add a new expression if the limit is not reached', () => {
      const oldExpressions = [];
      const newExpressions = addExpressionIfLimitNotReached(oldExpressions, false);

      expect(newExpressions).toHaveLength(1);
    });
    it('should not add a new expression if the limit is reached', () => {
      const oldExpressions = [internalExpressionWithMultipleSubExpressions];
      const newExpressions = addExpressionIfLimitNotReached(oldExpressions, true);

      expect(newExpressions).toEqual(oldExpressions);
    });
  });
  describe('deleteExpressionAndAddDefaultIfEmpty', () => {
    it('should delete the expression property from component and add a default expression when expressionToDelete was the only pre-existing', () => {
      component1Mock.hidden = internalExpressionWithMultipleSubExpressions;
      const expressionToDelete = internalExpressionWithMultipleSubExpressions;
      const oldExpressions = [expressionToDelete];
      const { newForm, updatedExpressions } = deleteExpressionAndAddDefaultIfEmpty(component1Mock, expressionToDelete, oldExpressions);

      expect(newForm.hidden).toBeUndefined();
      expect(updatedExpressions).toHaveLength(1);
      expect(updatedExpressions[0].id).not.toBe(internalExpressionWithMultipleSubExpressions.id);
    });

    it('should not add a default expression when there are more than one pre-existing expressions', () => {
      component1Mock.hidden = internalExpressionWithMultipleSubExpressions;
      const expressionToDelete = internalExpressionWithMultipleSubExpressions;
      const oldExpressions = [expressionToDelete, internalParsableComplexExpression];
      const { newForm, updatedExpressions }  = deleteExpressionAndAddDefaultIfEmpty(component1Mock, expressionToDelete, oldExpressions);

      expect(newForm.hidden).toBeUndefined();
      expect(updatedExpressions).toHaveLength(1);
      expect(updatedExpressions[0]).toStrictEqual(internalParsableComplexExpression);
    });
  });
  describe('removeInvalidExpressions', () => {
    it('should remove expressions with invalid properties', () => {
      const expression1 = { id: '1', property: ExpressionPropertyBase.Hidden };
      const expression2 = { id: '2' };
      const expression3 = { id: '3', complexExpression: 'some-complex-expression' };
      const expression4 = { id: '4' };
      const oldExpressions = [expression1, expression2, expression3, expression4];
      const updatedExpressions = removeInvalidExpressions(oldExpressions);

      expect(updatedExpressions).toHaveLength(2);
      expect(updatedExpressions).toContainEqual(expression1);
      expect(updatedExpressions).toContainEqual(expression3);
    });
  });
  describe('removeSubExpressionAndAdaptParentProps', () => {
    it('should remove a subExpression and do nothing more with parent properties when there are more than 2 subExpressions to start with', () => {
      const internalExpressionCopy = deepCopy(internalExpressionWithMultipleSubExpressions);
      internalExpressionCopy.subExpressions.push(subExpression0)
      const newExpression = removeSubExpressionAndAdaptParentProps(internalExpressionCopy, subExpression0);

      expect(newExpression.operator).toBe(Operator.Or);
      expect(newExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(newExpression.subExpressions).toHaveLength(2);
      expect(newExpression.subExpressions).toStrictEqual(internalExpressionWithMultipleSubExpressions.subExpressions);
    });
    it('should remove a subExpression and clear operator when there is only one subExpression left', () => {
      const internalExpressionCopy = deepCopy(internalExpressionWithMultipleSubExpressions);
      const newExpression = removeSubExpressionAndAdaptParentProps(internalExpressionCopy, subExpression1);

      expect(newExpression.operator).toBeUndefined();
      expect(newExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(newExpression.subExpressions).toHaveLength(1);
    });

    it('should have no subExpressions and clear operator and property when there is no subExpressions left', () => {
      const internalExpressionCopy = deepCopy(internalExpressionWithMultipleSubExpressions);
      internalExpressionCopy.subExpressions.pop();
      const newExpression = removeSubExpressionAndAdaptParentProps(internalExpressionCopy, subExpression1);

      expect(newExpression.operator).toBeUndefined();
      expect(newExpression.property).toBeUndefined();
      expect(newExpression.subExpressions).toBeUndefined();
    });
  });
  describe('addProperty', () => {
    it('should add an action to the expression when action is not "default"', () => {
      const newExpression = addProperty(internalExpressionWithMultipleSubExpressions, ExpressionPropertyBase.Required);

      expect(newExpression).toBeDefined();
      expect(newExpression.operator).toBe(Operator.Or);
      expect(newExpression.property).not.toBe(internalExpressionWithMultipleSubExpressions.property);
      expect(newExpression.property).toBe(ExpressionPropertyBase.Required);
      expect(newExpression.subExpressions).toHaveLength(2);
      expect(newExpression.subExpressions[0].id).toBe(subExpression1.id);
      expect(newExpression.subExpressions[1].id).toBe(subExpression2.id);
    });
    it('should return nothing when action is "default"', () => {
      const propertyToAdd = 'default';
      const newExpression = addProperty(internalExpressionWithMultipleSubExpressions, propertyToAdd);

      expect(newExpression).toBeUndefined();
    });
    it('should create a new subExpression when there are no subExpressions', () => {
      const newExpression = addProperty(baseInternalExpression, ExpressionPropertyBase.ReadOnly);

      expect(newExpression).toBeDefined();
      expect(newExpression.property).toBe(ExpressionPropertyBase.ReadOnly);
      expect(newExpression.subExpressions).toHaveLength(1);
      expect(newExpression.subExpressions[0]).toHaveProperty('id');
    });
  });
});

