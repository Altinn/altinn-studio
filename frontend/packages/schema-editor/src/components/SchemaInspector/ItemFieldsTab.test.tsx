import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import type { ItemFieldsTabProps } from './ItemFieldsTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  createChildNode,
  createNodeBase,
  FieldType,
  Keywords,
  ObjectKind,
} from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';

// Test data:
const selectedItem: UiSchemaNode = {
  ...createNodeBase(Keywords.Properties, 'test'),
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
};
const fieldNames = ['Donald', 'Dolly'];
const childNodes = fieldNames.map((childNodeName) => ({
  ...createChildNode(selectedItem, childNodeName, false),
  fieldType: FieldType.String,
}));
const numberOfFields = fieldNames.length;
// eslint-disable-next-line testing-library/no-node-access
selectedItem.children = childNodes.map(({ pointer }) => pointer);
const uiSchema: UiSchemaNodes = [selectedItem, ...childNodes];
const textAdd = 'Legg til felt';
const textDelete = 'Slett';
const textDeleteField = 'Slett felt';
const textFieldName = 'Navn på felt';
const textRequired = 'Påkrevd';
const textType = 'Type';
const fieldTypeNames = {
  [FieldType.Boolean]: 'Ja/nei',
  [FieldType.Integer]: 'Helt tall',
  [FieldType.Number]: 'Desimaltall',
  [FieldType.Object]: 'Objekt',
  [FieldType.String]: 'Tekst',
};
const texts = {
  'schema_editor.add_property': textAdd,
  'schema_editor.delete': textDelete,
  'schema_editor.delete_field': textDeleteField,
  'schema_editor.field_name': textFieldName,
  'schema_editor.required': textRequired,
  'schema_editor.type': textType,
  'schema.editor.number': fieldTypeNames[FieldType.Number],
  'schema_editor.boolean': fieldTypeNames[FieldType.Boolean],
  'schema_editor.integer': fieldTypeNames[FieldType.Integer],
  'schema_editor.object': fieldTypeNames[FieldType.Object],
  'schema_editor.string': fieldTypeNames[FieldType.String],
};
const defaultProps: ItemFieldsTabProps = { selectedItem };
const defaultState = { uiSchema };

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const renderItemFieldsTab = (props?: Partial<ItemFieldsTabProps>, state?: any) =>
  renderWithRedux(<ItemFieldsTab {...defaultProps} {...props} />, { ...defaultState, ...state });

describe('ItemFieldsTab', () => {
  test('Header texts appear', async () => {
    renderItemFieldsTab();
    expect(await screen.findByText(textFieldName)).toBeDefined();
    expect(await screen.findByText(textType)).toBeDefined();
    expect(await screen.findAllByText(textRequired)).toBeDefined();
    expect(await screen.findByText(textDelete)).toBeDefined();
  });

  test('Inputs and delete buttons appear for all fields', async () => {
    renderItemFieldsTab();
    const textboxes = await screen.findAllByLabelText(textFieldName);
    expect(textboxes).toHaveLength(numberOfFields);
    textboxes.forEach((textbox, i) => expect(textbox).toHaveValue(fieldNames[i]));
    expect(screen.getAllByRole('checkbox')).toHaveLength(numberOfFields);
    expect(screen.queryAllByLabelText(textDeleteField)).toHaveLength(numberOfFields);
  });

  test('"Add property" button appears', async () => {
    renderItemFieldsTab();
    expect(await screen.findByText(textAdd)).toBeDefined();
  });

  test('setPropertyName action is called with correct payload when a name is changed', async () => {
    const { user, store } = renderItemFieldsTab();
    const suffix = 'Duck';
    for (const fieldName of fieldNames) {
      await act(() => user.type(screen.getByDisplayValue(fieldName), suffix));
      await act(() => user.tab());
    }
    const setPropertyNameActions = store
      .getActions()
      .filter((action) => action.type === 'schemaEditor/setPropertyName');
    expect(setPropertyNameActions).toHaveLength(numberOfFields);
    setPropertyNameActions.forEach((action, i) => {
      expect(action.payload.name).toEqual(fieldNames[i] + suffix);
      expect(action.payload.path).toEqual(childNodes[i].pointer);
    });
  });

  test('setType action is called with correct payload when a type is changed', async () => {
    const { user, store } = renderItemFieldsTab();
    const newType = FieldType.Integer;
    for (const i in fieldNames) {
      await act(() => user.click(screen.getAllByRole('combobox')[i]));
      await act(() => user.click(screen.getByRole('option', { name: fieldTypeNames[newType] })));
      await act(() => user.tab());
    }
    const setPropertyNameActions = store
      .getActions()
      .filter((action) => action.type === 'schemaEditor/setType');
    expect(setPropertyNameActions).toHaveLength(numberOfFields);
    setPropertyNameActions.forEach((action, i) => {
      expect(action.payload.type).toEqual(newType);
      expect(action.payload.path).toEqual(childNodes[i].pointer);
    });
  });

  test('addProperty action is called with correct payload when the "Add field" button is clicked', async () => {
    const { user, store } = renderItemFieldsTab();
    await act(() => user.click(screen.getByText(textAdd)));
    const addPropertyActions = store
      .getActions()
      .filter((action) => action.type === 'schemaEditor/addProperty');
    expect(addPropertyActions).toHaveLength(1);
    expect(addPropertyActions[0].payload.pointer).toEqual(selectedItem.pointer);
  });

  test('addProperty action is calledd with correct payload when a field is focused and the Enter key is clicked', async () => {
    const { user, store } = renderItemFieldsTab();
    await act(() => user.click(screen.getAllByRole('textbox')[0]));
    await act(() => user.keyboard('{Enter}'));
    const addPropertyActions = store
      .getActions()
      .filter((action) => action.type === 'schemaEditor/addProperty');
    expect(addPropertyActions).toHaveLength(1);
    expect(addPropertyActions[0].payload.pointer).toEqual(selectedItem.pointer);
  });

  test('deleteProperty action is called with correct payload when delete button is clicked', async () => {
    const { user, store } = renderItemFieldsTab();
    for (const i in fieldNames) {
      await act(() => user.click(screen.queryAllByLabelText(textDeleteField)[i]));
    }
    const setPropertyNameActions = store
      .getActions()
      .filter((action) => action.type === 'schemaEditor/deleteProperty');
    expect(setPropertyNameActions).toHaveLength(numberOfFields);
    setPropertyNameActions.forEach((action, i) =>
      expect(action.payload.path).toEqual(childNodes[i].pointer)
    );
  });

  test('Newly added field gets focus and its text becomes selected', async () => {
    const { user, rerenderWithRedux } = renderItemFieldsTab();
    const newChildNodeName = 'Skrue';
    const newChildNode = {
      ...createChildNode(selectedItem, newChildNodeName, false),
      fieldType: FieldType.String,
    };
    const newSelectedItem = {
      ...selectedItem,
      // eslint-disable-next-line testing-library/no-node-access
      children: [...selectedItem.children, newChildNode.pointer],
    };
    const newUiSchema = [newSelectedItem, ...childNodes, newChildNode];
    rerenderWithRedux(<ItemFieldsTab {...defaultProps} selectedItem={newSelectedItem} />, {
      uiSchema: newUiSchema,
    });
    expect(screen.getByDisplayValue(newChildNodeName)).toHaveFocus();
    await act(() => user.keyboard('a')); // Should replace the current value since the text should be selected
    expect(screen.getByDisplayValue('a')).toBeDefined();
    expect(screen.queryByDisplayValue(newChildNodeName)).toBeFalsy();
  });

  test('Inputs are enabled by default', async () => {
    renderItemFieldsTab();
    const textboxes = await screen.findAllByRole('textbox');
    textboxes.forEach((input) => expect(input).toBeEnabled());
    screen.queryAllByRole('checkbox').forEach((input) => expect(input).toBeEnabled());
  });

  test('Inputs are disabled if the selected item is a reference', async () => {
    const referencedNode = createNodeBase(Keywords.Definitions, 'testtype');
    renderItemFieldsTab(
      {
        selectedItem: {
          ...selectedItem,
          objectKind: ObjectKind.Reference,
          reference: referencedNode.pointer,
        },
      },
      { uiSchema: [...uiSchema, referencedNode] }
    );
    const textboxes = await screen.findAllByLabelText(textFieldName);
    textboxes.forEach((input) => expect(input).toBeDisabled());
    screen.queryAllByRole('checkbox').forEach((input) => expect(input).toBeDisabled());
  });
});
