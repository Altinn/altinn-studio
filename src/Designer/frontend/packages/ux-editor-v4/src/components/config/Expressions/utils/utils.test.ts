import { ComponentType } from 'app-shared/types/ComponentType';
import {
  addExpressionToFormItem,
  expressionPropertiesOnFormItem,
  getDefinedExpressionProperties,
  getPropertyValue,
  getUndefinedExpressionProperties,
  removeExpressionFromFormItem,
  setExpressionOnFormItem,
} from './utils';
import type { FormComponent } from '../../../../types/FormComponent';
import type { FormContainer } from '../../../../types/FormContainer';
import type { FormItemProperty } from '../../../../types/FormItemProperty';
import type { BooleanExpression } from '@studio/components';
import { GeneralRelationOperator } from '@studio/components';

describe('utils', () => {
  describe('expressionPropertiesOnFormItem', () => {
    it('Returns hidden, required and readonly for form components', () => {
      expect(expressionPropertiesOnFormItem(ComponentType.Address)).toEqual([
        { key: 'hidden' },
        { key: 'required' },
        { key: 'readOnly' },
      ]);
    });

    it('Returns hidden and edit properties for repeating group', () => {
      expect(expressionPropertiesOnFormItem(ComponentType.RepeatingGroup)).toEqual([
        { key: 'hidden' },
        { key: 'edit', subKey: 'addButton' },
        { key: 'edit', subKey: 'editButton' },
        { key: 'edit', subKey: 'saveButton' },
        { key: 'edit', subKey: 'deleteButton' },
        { key: 'edit', subKey: 'alertOnDelete' },
        { key: 'edit', subKey: 'saveAndNextButton' },
      ]);
    });

    it('Returns hidden only for other components', () => {
      expect(expressionPropertiesOnFormItem(ComponentType.Paragraph)).toEqual([{ key: 'hidden' }]);
    });
  });

  describe('addExpressionToFormItem', () => {
    it('Adds an expression to a form item', () => {
      const inputComponent: FormComponent<ComponentType.Input> = {
        id: 'inputComponent',
        itemType: 'COMPONENT',
        pageIndex: null,
        type: ComponentType.Input,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        required: false,
      };
      const property: FormItemProperty<ComponentType.Input> = { key: 'hidden' };
      const result = addExpressionToFormItem<ComponentType.Input>(inputComponent, property);
      expect(result).toEqual({ ...inputComponent, hidden: null });
    });
  });

  describe('setExpressionOnFormItem', () => {
    it('Sets an expression on a simple item', () => {
      const inputComponent: FormComponent<ComponentType.Input> = {
        id: 'inputComponent',
        itemType: 'COMPONENT',
        pageIndex: null,
        type: ComponentType.Input,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        required: false,
      };
      const property: FormItemProperty<ComponentType.Input> = { key: 'required' };
      const expression: BooleanExpression = [GeneralRelationOperator.Equals, 1, 1];
      const result = setExpressionOnFormItem<ComponentType.Input>(
        inputComponent,
        property,
        expression,
      );
      expect(result).toEqual({ ...inputComponent, required: expression });
    });

    it('Sets an expression on a subkey', () => {
      const repeatingGroup: FormContainer<ComponentType.RepeatingGroup> = {
        id: 'repeatingGroup',
        itemType: 'CONTAINER',
        pageIndex: null,
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      };
      const property: FormItemProperty<ComponentType.RepeatingGroup> = {
        key: 'edit',
        subKey: 'addButton',
      };
      const expression: BooleanExpression = [GeneralRelationOperator.Equals, 1, 1];
      const expectedResult: FormContainer<ComponentType.RepeatingGroup> = {
        ...repeatingGroup,
        edit: { addButton: expression },
      };
      const result = setExpressionOnFormItem<ComponentType.RepeatingGroup>(
        repeatingGroup,
        property,
        expression,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('removeExpressionFromFormItem', () => {
    it('Removes an expression from a simple form item', () => {
      const inputComponent: FormComponent<ComponentType.Input> = {
        id: 'inputComponent',
        itemType: 'COMPONENT',
        pageIndex: null,
        type: ComponentType.Input,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        required: [GeneralRelationOperator.Equals, 1, 1],
      };
      const property: FormItemProperty<ComponentType.Input> = { key: 'required' };
      const result = removeExpressionFromFormItem<ComponentType.Input>(inputComponent, property);
      expect(result).toEqual({ ...inputComponent, required: undefined });
    });

    it('Removes an expression from a subkey', () => {
      const repeatingGroup: FormContainer<ComponentType.RepeatingGroup> = {
        id: 'repeatingGroup',
        itemType: 'CONTAINER',
        pageIndex: null,
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
        edit: {
          addButton: [GeneralRelationOperator.Equals, 1, 1],
          deleteButton: true,
        },
      };
      const property: FormItemProperty<ComponentType.RepeatingGroup> = {
        key: 'edit',
        subKey: 'addButton',
      };
      const result = removeExpressionFromFormItem<ComponentType.RepeatingGroup>(
        repeatingGroup,
        property,
      );
      expect(result).toEqual({ ...repeatingGroup, edit: { deleteButton: true } });
    });
  });

  describe('getDefinedExpressionProperties', () => {
    it('Returns all properties with defined expressions on the given component', () => {
      const repeatingGroup: FormContainer<ComponentType.RepeatingGroup> = {
        id: 'repeatingGroup',
        itemType: 'CONTAINER',
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
        hidden: true,
        edit: {
          addButton: null,
          editButton: [GeneralRelationOperator.Equals, 1, 1],
        },
      };
      const expectedResult: FormItemProperty<ComponentType.RepeatingGroup>[] = [
        { key: 'hidden' },
        { key: 'edit', subKey: 'addButton' },
        { key: 'edit', subKey: 'editButton' },
      ];
      const result = getDefinedExpressionProperties<ComponentType.RepeatingGroup>(repeatingGroup);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUndefinedExpressionProperties', () => {
    it('Returns all properties with undefined expressions on the given component', () => {
      const repeatingGroup: FormContainer<ComponentType.RepeatingGroup> = {
        id: 'repeatingGroup',
        itemType: 'CONTAINER',
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
        edit: {
          alertOnDelete: null,
          editButton: [GeneralRelationOperator.Equals, 1, 1],
        },
      };
      const expectedResult: FormItemProperty<ComponentType.RepeatingGroup>[] = [
        { key: 'hidden' },
        { key: 'edit', subKey: 'addButton' },
        { key: 'edit', subKey: 'saveButton' },
        { key: 'edit', subKey: 'deleteButton' },
        { key: 'edit', subKey: 'saveAndNextButton' },
      ];
      const result = getUndefinedExpressionProperties<ComponentType.RepeatingGroup>(repeatingGroup);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPropertyValue', () => {
    it('Returns the value of the given property on the given component', () => {
      const hidden: BooleanExpression = true;
      const addButton: BooleanExpression = null;
      const editButton: BooleanExpression = [GeneralRelationOperator.Equals, 1, 1];
      const repeatingGroup: FormContainer<ComponentType.RepeatingGroup> = {
        id: 'repeatingGroup',
        itemType: 'CONTAINER',
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
        hidden,
        edit: {
          addButton,
          editButton,
        },
      };
      const hiddenProp: FormItemProperty<ComponentType.RepeatingGroup> = { key: 'hidden' };
      const addButtonProp: FormItemProperty<ComponentType.RepeatingGroup> = {
        key: 'edit',
        subKey: 'addButton',
      };
      const editButtonProp: FormItemProperty<ComponentType.RepeatingGroup> = {
        key: 'edit',
        subKey: 'editButton',
      };
      expect(getPropertyValue<ComponentType.RepeatingGroup>(repeatingGroup, hiddenProp)).toEqual(
        hidden,
      );
      expect(getPropertyValue<ComponentType.RepeatingGroup>(repeatingGroup, addButtonProp)).toEqual(
        addButton,
      );
      expect(
        getPropertyValue<ComponentType.RepeatingGroup>(repeatingGroup, editButtonProp),
      ).toEqual(editButton);
    });

    it('Returns undefined when the property is not set', () => {
      const inputComponent: FormComponent<ComponentType.Input> = {
        id: 'inputComponent',
        itemType: 'COMPONENT',
        pageIndex: null,
        type: ComponentType.Input,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      };
      const repeatingGroupWithoutEditProp: FormContainer<ComponentType.RepeatingGroup> = {
        id: 'repeatingGroup',
        itemType: 'CONTAINER',
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      };
      const hiddenProp: FormItemProperty<ComponentType.Input> = { key: 'hidden' };
      const addButtonProp: FormItemProperty<ComponentType.RepeatingGroup> = {
        key: 'edit',
        subKey: 'addButton',
      };
      expect(getPropertyValue<ComponentType.Input>(inputComponent, hiddenProp)).toBeUndefined();
      expect(
        getPropertyValue<ComponentType.RepeatingGroup>(
          repeatingGroupWithoutEditProp,
          addButtonProp,
        ),
      ).toBeUndefined();
    });
  });
});
