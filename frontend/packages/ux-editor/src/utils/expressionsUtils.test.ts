import {
  DataSource,
  Expression,
  ExpressionFunction,
  ExpressionPropertyBase,
  ExpressionPropertyForGroup,
  Operator,
  SubExpression,
} from '../types/Expressions';
import {
  addDataSourceToSubExpression,
  addDataSourceValueToSubExpression,
  addFunctionToSubExpression,
  addPropertyForExpression,
  addPropertyToExpression,
  addSubExpressionToExpression,
  canExpressionBeSaved,
  convertAndAddExpressionToComponent,
  convertExternalExpressionToInternal,
  convertInternalExpressionToExternal,
  convertInternalSubExpressionToExternal,
  convertSubExpression,
  deleteExpression,
  deleteExpressionFromPropertyOnComponent,
  removeSubExpression,
  stringifyValueForDisplay,
  tryParseExpression,
} from './expressionsUtils';
import { component1Mock } from '../testing/layoutMock';
import {
  baseInternalExpression,
  baseInternalSubExpression,
  booleanValue,
  componentId,
  datamodelField,
  equivalentExternalExpressionWithMultipleSubExpressions,
  internalExpressionWithMultipleSubExpressions,
  internalParsableComplexExpression,
  internalUnParsableComplexExpression,
  nullValue,
  numberValue,
  parsableComplexExpression,
  parsableExternalExpression,
  parsableNotStudioFriendlyComplexExpression,
  parsableNotStudioFriendlyLongComplexExpression,
  simpleInternalExpression,
  stringValue,
  subExpression0,
  subExpression1,
  subExpression2,
  unParsableComplexExpression,
} from '../testing/expressionMocks';
import { deepCopy } from 'app-shared/pure';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { FormContainer } from '../types/FormContainer';

describe('expressionsUtils', () => {
  describe('convertSubExpression', () => {
    it('converts first part of external subexpression in array format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const externalExpEl: [string, string] = ['component', 'test-comp'];
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        false,
      );

      expect(convertedSubExpression.dataSource).toBe(DataSource.Component);
      expect(convertedSubExpression.value).toBe(externalExpEl[1]);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in array format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const externalExpEl: [string, string] = ['component', 'test-comp'];
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        true,
      );

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Component);
      expect(convertedSubExpression.comparableValue).toBe(externalExpEl[1]);
    });
    it('converts first part of external subexpression in string format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const externalExpEl = 'test-string';
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        false,
      );

      expect(convertedSubExpression.dataSource).toBe(DataSource.String);
      expect(convertedSubExpression.value).toBe(externalExpEl);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in string format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const externalExpEl = 'test-string';
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        true,
      );

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.String);
      expect(convertedSubExpression.comparableValue).toBe(externalExpEl);
    });
    it('converts first part of external subexpression in number format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const externalExpEl = 1024;
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        false,
      );

      expect(convertedSubExpression.dataSource).toBe(DataSource.Number);
      expect(convertedSubExpression.value).toBe(externalExpEl);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in number format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const externalExpEl = 1024;
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        true,
      );

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Number);
      expect(convertedSubExpression.comparableValue).toBe(externalExpEl);
    });
    it('converts first part of external subexpression as null to internal subexpression where dataSource is set', () => {
      const externalExpEl = null;
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        false,
      );

      expect(convertedSubExpression.dataSource).toBe(DataSource.Null);
      expect(convertedSubExpression.value).toBe(null);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression as null to internal subexpression where compDataSource is set', () => {
      const externalExpEl = null;
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        true,
      );

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Null);
      expect(convertedSubExpression.comparableValue).toBe(null);
    });
    it('converts first part of external subexpression as boolean to internal subexpression where dataSource and dataSourceValue are set', () => {
      const externalExpEl = true;
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        false,
      );

      expect(convertedSubExpression.dataSource).toBe(DataSource.Boolean);
      expect(convertedSubExpression.value).toBe(externalExpEl);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression as boolean to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const externalExpEl = false;
      const convertedSubExpression: SubExpression = convertSubExpression(
        baseInternalSubExpression,
        externalExpEl,
        true,
      );

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Boolean);
      expect(convertedSubExpression.comparableValue).toBe(externalExpEl);
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
      const externalExpression = convertInternalExpressionToExternal(
        internalExpressionWithMultipleSubExpressions,
      );

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
      const externalExpression = convertInternalExpressionToExternal(
        internalUnParsableComplexExpression,
      );

      expect(typeof externalExpression).toBe('string');
      expect(externalExpression).toBe(unParsableComplexExpression);
    });
  });
  describe('convertInternalSubExpressionToExternal', () => {
    it('converts most basic valid internal sub expression', () => {
      const externalExpression: any =
        convertInternalSubExpressionToExternal(baseInternalSubExpression);

      expect(externalExpression).toBeInstanceOf(Array);
      expect(externalExpression[0]).toBe(ExpressionFunction.Equals);
      expect(externalExpression[1]).toBe(nullValue);
      expect(externalExpression[2]).toBe(nullValue);
    });
    it('converts valid internal sub expression', () => {
      const externalExpression: any = convertInternalSubExpressionToExternal(subExpression0);

      expect(externalExpression).toBeInstanceOf(Array);
      expect(externalExpression[0]).toBe(ExpressionFunction.Equals);
      expect(externalExpression[1][0]).toBe(DataSource.Component);
      expect(externalExpression[1][1]).toBe(componentId);
      expect(externalExpression[2]).toBe(stringValue);
    });
  });
  describe('convertExternalExpressionToInternal', () => {
    it('converts expression with one subExpression where first part is array and second null to valid internal expression', () => {
      const externalExpression: any = ['equals', ['component', componentId], nullValue];
      const internalExpression: Expression = convertExternalExpressionToInternal(
        ExpressionPropertyBase.Hidden,
        externalExpression,
      );

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
      const externalExpression: any = ['equals', stringValue, numberValue];
      const internalExpression: Expression = convertExternalExpressionToInternal(
        ExpressionPropertyBase.Hidden,
        externalExpression,
      );

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
      const externalExpression: any = ['equals', nullValue, nullValue];
      const internalExpression: Expression = convertExternalExpressionToInternal(
        ExpressionPropertyBase.Hidden,
        externalExpression,
      );

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
      const internalExpression: Expression = convertExternalExpressionToInternal(
        ExpressionPropertyBase.Hidden,
        parsableExternalExpression,
      );

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
      const internalExpression: Expression = convertExternalExpressionToInternal(
        ExpressionPropertyBase.Hidden,
        parsableNotStudioFriendlyComplexExpression,
      );

      expect(internalExpression.complexExpression).toBe(parsableNotStudioFriendlyComplexExpression);
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.operator).toBe(undefined);
      expect(internalExpression.subExpressions).toBe(undefined);
    });
    it('converts expression with multiple nested subExpressions to internal complex expression', () => {
      const internalExpression: Expression = convertExternalExpressionToInternal(
        ExpressionPropertyBase.Hidden,
        parsableNotStudioFriendlyLongComplexExpression,
      );

      expect(internalExpression.complexExpression).toBe(
        parsableNotStudioFriendlyLongComplexExpression,
      );
      expect(internalExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(internalExpression.operator).toBe(undefined);
      expect(internalExpression.subExpressions).toBe(undefined);
    });
  });
  describe('convertAndAddExpressionToComponent', () => {
    it('converted expression is set on form component hidden property', async () => {
      const updatedComponent = convertAndAddExpressionToComponent(
        component1Mock,
        internalExpressionWithMultipleSubExpressions,
      );

      expect(updatedComponent.hidden).toStrictEqual(
        equivalentExternalExpressionWithMultipleSubExpressions,
      );
    });
    it('converted and parsed complex expression is set as array on form component hidden property', () => {
      const updatedComponent = convertAndAddExpressionToComponent(
        component1Mock,
        internalParsableComplexExpression,
      );

      expect(updatedComponent.hidden).toStrictEqual(parsableExternalExpression);
      expect(updatedComponent.hidden).toBeInstanceOf(Array);
    });
    it('converted complex expression is set as string on form component hidden property', () => {
      const updatedComponent = convertAndAddExpressionToComponent(
        component1Mock,
        internalUnParsableComplexExpression,
      );

      expect(updatedComponent.hidden).toStrictEqual(unParsableComplexExpression);
      expect(typeof updatedComponent.hidden).toBe('string');
    });
    it('converted expression is set as string on form group component edit.addButton property', () => {
      const groupComponentWithAllBooleanFieldsAsExpressions: FormContainer = {
        id: 'some-id',
        itemType: 'CONTAINER',
        hidden: parsableExternalExpression,
        required: parsableExternalExpression,
        readOnly: parsableExternalExpression,
        edit: {
          addButton: parsableExternalExpression,
          deleteButton: parsableExternalExpression,
          saveButton: parsableExternalExpression,
          saveAndNextButton: parsableExternalExpression,
        },
      };
      const updatedComponent = convertAndAddExpressionToComponent(
        groupComponentWithAllBooleanFieldsAsExpressions,
        {
          ...internalExpressionWithMultipleSubExpressions,
          property: ExpressionPropertyForGroup.EditAddButton,
        },
      );

      expect(updatedComponent.edit.addButton).toStrictEqual(
        equivalentExternalExpressionWithMultipleSubExpressions,
      );
      expect(updatedComponent.edit.addButton).toBeInstanceOf(Array);
    });
  });
  describe('deleteExpressionFromPropertyOnComponent', () => {
    it('should delete the property on the form component connected to the expression', () => {
      const newFormComponent = deleteExpressionFromPropertyOnComponent(
        component1Mock,
        ExpressionPropertyBase.Hidden,
      );

      expect(newFormComponent.hidden).toBeUndefined();
    });
  });
  describe('addPropertyForExpression', () => {
    it('should add a new property for expression', () => {
      const oldProperties = [];
      const newProperties = addPropertyForExpression(
        oldProperties,
        ExpressionPropertyBase.ReadOnly,
      );

      expect(newProperties).toHaveLength(1);
    });
  });
  describe('deleteExpression', () => {
    it('should delete the expression from the expressions', () => {
      const oldExpressions: Expression[] = [internalExpressionWithMultipleSubExpressions];
      const updatedExpressions = deleteExpression(
        internalExpressionWithMultipleSubExpressions,
        oldExpressions,
      );

      expect(updatedExpressions).toHaveLength(0);
    });
  });
  describe('removeSubExpression', () => {
    it('should remove a subExpression and do nothing more with parent properties when there are more than 2 subExpressions to start with', () => {
      const internalExpressionCopy = deepCopy(internalExpressionWithMultipleSubExpressions);
      internalExpressionCopy.subExpressions.push(subExpression0);
      const newExpression = removeSubExpression(internalExpressionCopy, subExpression0);

      expect(newExpression.operator).toBe(Operator.Or);
      expect(newExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(newExpression.subExpressions).toHaveLength(2);
      expect(newExpression.subExpressions).toStrictEqual(
        internalExpressionWithMultipleSubExpressions.subExpressions,
      );
    });
    it('should remove a subExpression and clear operator when there is only one subExpression left', () => {
      const newExpression = removeSubExpression(
        internalExpressionWithMultipleSubExpressions,
        subExpression1,
      );

      expect(newExpression.operator).toBeUndefined();
      expect(newExpression.property).toBe(ExpressionPropertyBase.Hidden);
      expect(newExpression.subExpressions).toHaveLength(1);
    });
  });
  describe('addPropertyToExpression', () => {
    it('should add an action to the expression when action is not "default"', () => {
      const newExpression = addPropertyToExpression(
        internalExpressionWithMultipleSubExpressions,
        ExpressionPropertyBase.Required,
      );

      expect(newExpression).toBeDefined();
      expect(newExpression.operator).toBe(Operator.Or);
      expect(newExpression.property).not.toBe(
        internalExpressionWithMultipleSubExpressions.property,
      );
      expect(newExpression.property).toBe(ExpressionPropertyBase.Required);
      expect(newExpression.subExpressions).toHaveLength(2);
      expect(newExpression.subExpressions[0]).toStrictEqual(subExpression1);
      expect(newExpression.subExpressions[1]).toStrictEqual(subExpression2);
    });
    it('should return nothing when action is "default"', () => {
      const propertyToAdd = 'default';
      const newExpression = addPropertyToExpression(
        internalExpressionWithMultipleSubExpressions,
        propertyToAdd,
      );

      expect(newExpression).toStrictEqual(internalExpressionWithMultipleSubExpressions);
    });
    it('should create a new subExpression when there are no subExpressions', () => {
      const newExpression = addPropertyToExpression(
        baseInternalExpression,
        ExpressionPropertyBase.ReadOnly,
      );

      expect(newExpression).toBeDefined();
      expect(newExpression.property).toBe(ExpressionPropertyBase.ReadOnly);
      expect(newExpression.subExpressions).toHaveLength(1);
      expect(newExpression.subExpressions[0]).toMatchObject({});
    });
  });
  describe('addFunctionToSubExpression', () => {
    it('should add a function to a base sub expression when function is not "default"', () => {
      const newSubExpression = addFunctionToSubExpression({}, ExpressionFunction.Not);

      expect(newSubExpression.function).toBe(ExpressionFunction.Not);
    });
    it('should delete function when function is "default"', () => {
      const functionToAdd = 'default';
      const newSubExpression = addFunctionToSubExpression(baseInternalSubExpression, functionToAdd);

      expect(newSubExpression.function).not.toBeDefined();
    });
    it('should update function only when new function is selected', () => {
      const newSubExpression = addFunctionToSubExpression(subExpression0, ExpressionFunction.Not);

      expect(subExpression0.function).toBe(ExpressionFunction.Equals);
      expect(newSubExpression.function).toBe(ExpressionFunction.Not);
      expect(newSubExpression.dataSource).toBe(subExpression0.dataSource);
      expect(newSubExpression.value).toBe(subExpression0.value);
      expect(newSubExpression.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newSubExpression.comparableValue).toBe(subExpression0.comparableValue);
    });
  });
  describe('addSubExpressionToExpression', () => {
    it('should add an empty sub expression and no operator when there is no subexpression from before', () => {
      const newExpression = addSubExpressionToExpression(
        { property: ExpressionPropertyBase.Hidden },
        Operator.Or,
      );

      expect(newExpression.subExpressions).toHaveLength(1);
      expect(newExpression.subExpressions[0]).toStrictEqual({});
      expect(newExpression.operator).toBeUndefined();
    });
    it('should add sub expression and operator when there are subexpressions from before', () => {
      const newExpression = addSubExpressionToExpression(simpleInternalExpression, Operator.And);

      expect(newExpression.subExpressions).toHaveLength(2);
      expect(newExpression.subExpressions[1]).toStrictEqual({});
      expect(newExpression.operator).toBe(Operator.And);
    });
  });
  describe('addDataSource', () => {
    it('should remove comparableValue and comparableDataSource when dataSource is "default" and isComparable is true', () => {
      const newExpEl = addDataSourceToSubExpression(subExpression0, 'default', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBeUndefined();
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBeUndefined();
    });
    it('should remove value and dataSource when dataSource is "default" and isComparable is false', () => {
      const newExpEl = addDataSourceToSubExpression(subExpression0, 'default', false);

      expect(newExpEl.dataSource).toBeUndefined();
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBeUndefined();
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should remove comparableValue when comparableDataSource has not changed and isComparable is true', () => {
      const newExpEl = addDataSourceToSubExpression(
        subExpression0,
        subExpression0.comparableDataSource,
        true,
      );

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBeUndefined();
    });
    it('should remove value when dataSource has not changed and isComparable is false', () => {
      const newExpEl = addDataSourceToSubExpression(
        subExpression0,
        subExpression0.dataSource,
        false,
      );

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBeUndefined();
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should set comparableValue to true when dataSource is DataSource.Boolean and isComparable is true', () => {
      const newExpEl = addDataSourceToSubExpression(subExpression0, DataSource.Boolean, true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(DataSource.Boolean);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe(true);
    });
    it('should set value to true when dataSource is DataSource.Boolean and isComparable is false', () => {
      const newExpEl = addDataSourceToSubExpression(subExpression0, DataSource.Boolean, false);

      expect(newExpEl.dataSource).toBe(DataSource.Boolean);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(true);
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should remove value when dataSource is set to something else than it was, but not Boolean or DropDown', () => {
      const newExpEl = addDataSourceToSubExpression(subExpression0, DataSource.Number, false);

      expect(newExpEl.dataSource).toBe(DataSource.Number);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBeUndefined();
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
  });
  describe('addDataSourceValue', () => {
    it('should remove comparableValue when dataSourceValue is "default"', () => {
      const newExpEl = addDataSourceValueToSubExpression(subExpression0, 'default', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBeUndefined();
    });
    it('should set comparableValue to boolean type true when dataSource is DataSource.Boolean and dataSourceValue is "true"', () => {
      subExpression0.comparableDataSource = DataSource.Boolean;
      const newExpEl = addDataSourceValueToSubExpression(subExpression0, 'true', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe(true);
    });
    it('should set comparableValue to boolean type false when dataSource is DataSource.Boolean and dataSourceValue is "false"', () => {
      subExpression0.comparableDataSource = DataSource.Boolean;
      const newExpEl = addDataSourceValueToSubExpression(subExpression0, 'false', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(DataSource.Boolean);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe(false);
    });
    it('should set comparableValue to the parsed float when dataSource is DataSource.Number', () => {
      subExpression0.dataSource = DataSource.Number;
      const newExpEl = addDataSourceValueToSubExpression(subExpression0, '123.45', false);

      expect(newExpEl.dataSource).toBe(DataSource.Number);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(123.45);
      expect(newExpEl.comparableValue).toBe(subExpression0.comparableValue);
    });
    it('should set comparableValue to the string value when dataSource is not DataSource.Boolean or DataSource.Number and dataSourceValue is not null', () => {
      subExpression0.comparableDataSource = DataSource.String;
      const newExpEl = addDataSourceValueToSubExpression(subExpression0, 'NewValue', true);

      expect(newExpEl.dataSource).toBe(subExpression0.dataSource);
      expect(newExpEl.comparableDataSource).toBe(subExpression0.comparableDataSource);
      expect(newExpEl.value).toBe(subExpression0.value);
      expect(newExpEl.comparableValue).toBe('NewValue');
    });
  });
  describe('tryParseExpression', () => {
    it('should parse valid JSON complexExpression', () => {
      const newExpression: Expression = tryParseExpression(
        baseInternalExpression,
        parsableComplexExpression,
      );
      const parsedComplexExpression = JSON.parse(parsableComplexExpression);

      expect(newExpression.complexExpression).toStrictEqual(parsedComplexExpression);
    });
    it('should handle invalid JSON complexExpression and keep it as a string', () => {
      const newExpression: Expression = tryParseExpression(
        baseInternalExpression,
        unParsableComplexExpression,
      );

      expect(newExpression.complexExpression).toStrictEqual(unParsableComplexExpression);
    });
  });
  describe('canExpressionBeSaved', () => {
    it('should return true for a simple expression that have property and function set for all subexpressions', () => {
      const canBeSaved: boolean = canExpressionBeSaved(
        internalExpressionWithMultipleSubExpressions,
      );
      expect(canBeSaved).toBe(true);
    });
    it('should return true for a complex expression that have property and complex expression set', () => {
      const canBeSaved: boolean = canExpressionBeSaved(internalParsableComplexExpression);
      expect(canBeSaved).toBe(true);
    });
    it('should return false for a simple expression that does not have property but function set for all subexpressions', () => {
      const expressionWithoutProperty: Expression = {
        ...internalExpressionWithMultipleSubExpressions,
        property: undefined,
      };
      const canBeSaved: boolean = canExpressionBeSaved(expressionWithoutProperty);
      expect(canBeSaved).toBe(false);
    });
    it('should return false for a simple expression that have property but not function set for all subexpressions', () => {
      const expressionWithSubExpressionWithoutFunction: Expression = {
        ...internalExpressionWithMultipleSubExpressions,
        subExpressions: [
          ...internalExpressionWithMultipleSubExpressions.subExpressions,
          {
            ...internalExpressionWithMultipleSubExpressions.subExpressions[0],
            function: undefined,
          },
        ],
      };
      const canBeSaved: boolean = canExpressionBeSaved(expressionWithSubExpressionWithoutFunction);
      expect(canBeSaved).toBe(false);
    });
    it('should return false for a complex expression that does not have property but complex expression is set', () => {
      const complexExpressionWithoutProperty: Expression = {
        ...internalParsableComplexExpression,
        property: undefined,
      };
      const canBeSaved: boolean = canExpressionBeSaved(complexExpressionWithoutProperty);
      expect(canBeSaved).toBe(false);
    });
    it('should return false for a complex expression that have property but complex expression is undefined', () => {
      const expressionWithoutComplexExpression: Expression = {
        ...internalParsableComplexExpression,
        complexExpression: undefined,
      };
      const canBeSaved: boolean = canExpressionBeSaved(expressionWithoutComplexExpression);
      expect(canBeSaved).toBe(false);
    });
    it('should return false for a complex expression that have property but complex expression is null', () => {
      const expressionWithoutComplexExpression: Expression = {
        ...internalParsableComplexExpression,
        complexExpression: null,
      };
      const canBeSaved: boolean = canExpressionBeSaved(expressionWithoutComplexExpression);
      expect(canBeSaved).toBe(false);
    });
  });
  describe('stringifyValueForDisplay', () => {
    it('should return "null" for null value', () => {
      const result = stringifyValueForDisplay(textMock, null);
      expect(result).toBe('null');
    });
    it('should return "null" for undefined value', () => {
      const result = stringifyValueForDisplay(textMock, undefined);
      expect(result).toBe('null');
    });
    it('should return "true" for true boolean value', () => {
      const result = stringifyValueForDisplay(textMock, true);
      expect(result).toBe(textMock('general.true'));
    });
    it('should return "false" for false boolean value', () => {
      const result = stringifyValueForDisplay(textMock, false);
      expect(result).toBe(textMock('general.false'));
    });
    it('should return string representation for string value', () => {
      const result = stringifyValueForDisplay(textMock, stringValue);
      expect(result).toBe(stringValue);
    });
    it('should return string representation for numeric value', () => {
      const result = stringifyValueForDisplay(textMock, numberValue);
      expect(result).toBe('1024');
    });
  });
});
