import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import {
  addExpressionToFormItem,
  expressionPropertiesOnFormItem,
  getDefinedExpressionProperties,
  getPropertyValue,
  getUndefinedExpressionProperties,
  removeExpressionFromFormItem,
  setExpressionOnFormItem,
} from './utils';
import type { FormContainer } from '../../../../types/FormContainer';
import type { FormItemProperty } from '../../../../types/FormItemProperty';
import { GeneralRelationOperator, type BooleanExpression } from '@studio/components';
import { getNestedPropertyDefinition } from '../../../../data/componentCatalog';

const property = (componentType: ComponentType, path: string[]): FormItemProperty => ({
  path,
  definition: getNestedPropertyDefinition(componentType, path)!,
});

describe('expression configuration', () => {
  it('derives available boolean expressions from the generated component definition', () => {
    expect(expressionPropertiesOnFormItem(ComponentType.Input).map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        ['hidden'],
        ['required'],
        ['readOnly'],
        ['forceShowInSummary'],
        ['removeWhenHidden'],
      ]),
    );
    expect(
      expressionPropertiesOnFormItem(ComponentType.RepeatingGroup).map(({ path }) => path),
    ).toContainEqual(['edit', 'addButton']);
  });

  it('sets, reads and removes expressions at nested catalog paths', () => {
    const formItem: FormContainer<ComponentType.RepeatingGroup> = {
      id: 'group',
      type: ComponentType.RepeatingGroup,
      dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      edit: { deleteButton: true },
    };
    const addButton = property(ComponentType.RepeatingGroup, ['edit', 'addButton']);
    const expression: BooleanExpression = [GeneralRelationOperator.Equals, 1, 1];

    const updated = setExpressionOnFormItem(formItem, addButton, expression);
    expect(getPropertyValue(updated, addButton)).toEqual(expression);
    expect(updated.edit.deleteButton).toBe(true);
    expect(removeExpressionFromFormItem(updated, addButton)).toEqual(formItem);
  });

  it('classifies expressions by whether a value is present', () => {
    const formItem: FormContainer<ComponentType.RepeatingGroup> = {
      id: 'group',
      type: ComponentType.RepeatingGroup,
      dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      edit: { addButton: null },
    };

    expect(getDefinedExpressionProperties(formItem).map(({ path }) => path)).toContainEqual([
      'edit',
      'addButton',
    ]);
    expect(getUndefinedExpressionProperties(formItem).map(({ path }) => path)).toContainEqual([
      'edit',
      'saveButton',
    ]);
  });

  it('adds an empty expression at a catalog path', () => {
    const formItem = { id: 'input', type: ComponentType.Input } as const;
    expect(addExpressionToFormItem(formItem, property(ComponentType.Input, ['hidden']))).toEqual({
      ...formItem,
      hidden: null,
    });
  });
});
