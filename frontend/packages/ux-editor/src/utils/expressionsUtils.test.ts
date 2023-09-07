import {
  DataSource,
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
  addDataSource,
  addDataSourceValue,
  tryParseExpression,
  stringifyValueForDisplay, deleteExpressionFromComponent,
} from './expressionsUtils';
import { component1Mock } from '../testing/layoutMock';
import {
  baseInternalExpression,
  baseInternalSubExpression,
  booleanValue,
  componentId,
  datamodelField, equivalentExternalExpressionWithMultipleSubExpressions,
  internalExpressionWithMultipleSubExpressions, internalParsableComplexExpression,
  internalUnParsableComplexExpression,
  nullValue,
  numberValue, parsableComplexExpression,
  parsableExternalExpression,
  parsableNotStudioFriendlyComplexExpression,
  parsableNotStudioFriendlyLongComplexExpression,
  simpleInternalExpression,
  stringValue, subExpression0, subExpression1, subExpression2,
  unParsableComplexExpression

} from '../testing/expressionMocks';
import { deepCopy } from 'app-shared/pure';

describe('expressionsUtils', () => {

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
      const extSubExpression: any = false;
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
      const updatedComponent = convertAndAddExpressionToComponent(component1Mock, internalExpressionWithMultipleSubExpressions);

      expect(updatedComponent.hidden).toStrictEqual(equivalentExternalExpressionWithMultipleSubExpressions);
    });
    it('converted and parsed complex expression is set as array on form component hidden property', () => {
      const updatedComponent = convertAndAddExpressionToComponent(component1Mock, internalParsableComplexExpression);

      expect(updatedComponent.hidden).toStrictEqual(parsableExternalExpression);
      expect(updatedComponent.hidden).toBeInstanceOf(Array);
    });
    it('converted complex expression is set as string on form component hidden property', () => {
      const updatedComponent = convertAndAddExpressionToComponent(component1Mock, internalUnParsableComplexExpression);

      expect(updatedComponent.hidden).toStrictEqual(unParsableComplexExpression);
      expect(typeof updatedComponent.hidden).toBe('string');
    });
  });
  describe('deleteExpressionFromComponent', () => {
    it('should delete the property on the form component connected to the expression', () => {
      const newExpressions = deleteExpressionFromComponent(component1Mock, internalExpressionWithMultipleSubExpressions);

      expect(newExpressions.hidden).toBeUndefined();
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
      const updatedExpressions = deleteExpressionAndAddDefaultIfEmpty(expressionToDelete, oldExpressions);

      expect(updatedExpressions).toHaveLength(1);
      expect(updatedExpressions[0].id).not.toBe(internalExpressionWithMultipleSubExpressions.id);
    });

    it('should not add a default expression when there are more than one pre-existing expressions', () => {
      component1Mock.hidden = internalExpressionWithMultipleSubExpressions;
      const expressionToDelete = internalExpressionWithMultipleSubExpressions;
      const oldExpressions = [expressionToDelete, internalParsableComplexExpression];
      const updatedExpressions = deleteExpressionAndAddDefaultIfEmpty(expressionToDelete, oldExpressions);

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
  describe('addDataSource', () => {
    it('should remove comparableValue and comparableDataSource when dataSource is "default" and isComparable is true', () => {
      const newExpEl = addDataSource(subExpression0, 'default', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBeUndefined();
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBeUndefined();
    });
    it('should remove value and dataSource when dataSource is "default" and isComparable is false', () => {
      const newExpEl = addDataSource(subExpression0, 'default', false);

      expect(newExpEl.dataSource).toBeUndefined();
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBeUndefined();
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should remove comparableValue when comparableDataSource has not changed and isComparable is true', () => {
      const newExpEl = addDataSource(subExpression0, subExpression0.comparableDataSource, true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBeUndefined();
    });
    it('should remove value when dataSource has not changed and isComparable is false', () => {
      const newExpEl = addDataSource(subExpression0, subExpression0.dataSource, false);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBeUndefined();
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should set comparableValue to true when dataSource is DataSource.Boolean and isComparable is true', () => {
      const newExpEl = addDataSource(subExpression0, DataSource.Boolean, true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(DataSource.Boolean);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe(true);
    });
    it('should set value to true when dataSource is DataSource.Boolean and isComparable is false', () => {
      const newExpEl = addDataSource(subExpression0, DataSource.Boolean, false);

      expect(newExpEl.dataSource).toBe(DataSource.Boolean);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(true);
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should remove value when dataSource is set to something else than it was, but not Boolean or DropDown', () => {
      const newExpEl = addDataSource(subExpression0, DataSource.Number, false);

      expect(newExpEl.dataSource).toBe(DataSource.Number);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBeUndefined();
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
  });
  describe('addDataSourceValue', () => {
    it('should remove comparableValue when dataSourceValue is "default"', () => {
      const newExpEl = addDataSourceValue(subExpression0, 'default', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBeUndefined();
    });
    it('should set comparableValue to boolean type true when dataSource is DataSource.Boolean and dataSourceValue is "true"', () => {
      subExpression0.comparableDataSource = DataSource.Boolean;
      const newExpEl = addDataSourceValue(subExpression0, 'true', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe(true);
    });
    it('should set comparableValue to boolean type false when dataSource is DataSource.Boolean and dataSourceValue is "false"', () => {
      subExpression0.comparableDataSource = DataSource.Boolean;
      const newExpEl = addDataSourceValue(subExpression0, 'false', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(DataSource.Boolean);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe(false);
    });
    it('should set comparableValue to the parsed float when dataSource is DataSource.Number', () => {
      subExpression0.dataSource = DataSource.Number;
      const newExpEl = addDataSourceValue(subExpression0, '123.45', false);

      expect(newExpEl.dataSource).toBe(DataSource.Number);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(123.45);
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should set comparableValue to the string value when dataSource is not DataSource.Boolean or DataSource.Number and dataSourceValue is not null', () => {
      subExpression0.comparableDataSource = DataSource.String;
      const newExpEl = addDataSourceValue(subExpression0, 'NewValue', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe('NewValue');
    });
  });
  describe('tryParseExpression', () => {
    it('should parse valid JSON complexExpression', () => {
      const newExpression = tryParseExpression(baseInternalExpression, parsableComplexExpression);
      const parsedComplexExpression = JSON.parse(parsableComplexExpression);

      expect(newExpression.complexExpression).toStrictEqual(parsedComplexExpression);
    });
    it('should handle invalid JSON complexExpression and keep it as a string', () => {
      const newExpression = tryParseExpression(baseInternalExpression, unParsableComplexExpression);

      expect(newExpression.complexExpression).toStrictEqual(unParsableComplexExpression);
    });
  });
  describe('stringifyValueForDisplay', () => {
    it('should return "null" for null value', () => {
      const result = stringifyValueForDisplay(null);
      expect(result).toBe('null');
    });
    it('should return "null" for undefined value', () => {
      const result = stringifyValueForDisplay(undefined);
      expect(result).toBe('null');
    });
    it('should return "true" for true boolean value', () => {
      const result = stringifyValueForDisplay(true);
      expect(result).toBe('true');
    });
    it('should return "false" for false boolean value', () => {
      const result = stringifyValueForDisplay(false);
      expect(result).toBe('false');
    });
    it('should return string representation for string value', () => {
      const result = stringifyValueForDisplay(stringValue);
      expect(result).toBe(stringValue);
    });
    it('should return string representation for numeric value', () => {
      const result = stringifyValueForDisplay(numberValue);
      expect
      (result).toBe('1024');
    });
  });
});

