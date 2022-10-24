import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { ItemFieldsTab, ItemFieldsTabProps } from './ItemFieldsTab';
import {
  createChildNode,
  createNodeBase,
  FieldType,
  Keywords,
  ObjectKind,
  UiSchemaNode,
  UiSchemaNodes
} from '@altinn/schema-model';

// Test data:
const selectedItem: UiSchemaNode = {
  ...createNodeBase(Keywords.Properties, 'test'),
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
};
const fieldNames = ['Donald', 'Dolly'];
const childNodes = fieldNames.map((childNodeName) => ({
  ...createChildNode(selectedItem, childNodeName, false),
  fieldType: FieldType.String
}));
const numberOfFields = fieldNames.length;
selectedItem.children = childNodes.map(({ pointer }) => pointer);
const uiSchema: UiSchemaNodes = [selectedItem, ...childNodes];
const textRequired = 'Required';
const textDelete = 'Delete';
const textAdd = 'Legg til felt';
const language = {
  schema_editor: {
    add_property: textAdd,
    delete_field: textDelete,
    required: textRequired,
  }
};
const defaultProps: ItemFieldsTabProps = {
  language,
  selectedItem
};
const defaultState = { uiSchema };

const renderItemFieldsTab = (props?: Partial<ItemFieldsTabProps>, state?: any) => renderWithRedux(
  <ItemFieldsTab { ...defaultProps } { ...props } />,
  { ...defaultState, ...state }
);

test('Inputs and delete buttons appear for all fields', () => {
  renderItemFieldsTab();
  const textboxes = screen.getAllByRole('textbox');
  expect(textboxes).toHaveLength(numberOfFields);
  textboxes.forEach((textbox, i) => expect(textbox).toHaveValue(fieldNames[i]));
  expect(screen.getAllByRole('checkbox')).toHaveLength(numberOfFields);
  expect(screen.queryAllByLabelText(textDelete)).toHaveLength(numberOfFields);
});

test('"Add property" button appears', () => {
  renderItemFieldsTab();
  expect(screen.getByText(textAdd)).toBeDefined();
});

test('setPropertyName action is called with correct payload when a name is changed', async () => {
  const { user, store } = renderItemFieldsTab();
  const suffix = 'Duck';
  for (const fieldName of fieldNames) {
    await user.type(screen.getByDisplayValue(fieldName), suffix);
    await user.tab();
  }
  const setPropertyNameActions = store.getActions().filter(action => action.type === 'schemaEditor/setPropertyName');
  expect(setPropertyNameActions).toHaveLength(numberOfFields);
  setPropertyNameActions.forEach((action, i) => {
    expect(action.payload.name).toEqual(fieldNames[i] + suffix);
    expect(action.payload.path).toEqual(childNodes[i].pointer);
  });
});

test('addProperty action is called with correct payload when the "Add field" button is clicked', async () => {
  const { user, store } = renderItemFieldsTab();
  await user.click(screen.getByText(textAdd));
  const addPropertyActions = store.getActions().filter(action => action.type === 'schemaEditor/addProperty');
  expect(addPropertyActions).toHaveLength(1);
  expect(addPropertyActions[0].payload.pointer).toEqual(selectedItem.pointer);
});

test(
  'addProperty action is calledd with correct payload when a field is focused and the Enter key is clicked',
  async () => {
    const { user, store } = renderItemFieldsTab();
    await user.click(screen.getAllByRole('textbox')[0]);
    await user.keyboard('{Enter}');
    const addPropertyActions = store.getActions().filter(action => action.type === 'schemaEditor/addProperty');
    expect(addPropertyActions).toHaveLength(1);
    expect(addPropertyActions[0].payload.pointer).toEqual(selectedItem.pointer);
  }
);

test('deleteProperty action is called with correct payload when delete button is clicked', async () => {
  const { user, store } = renderItemFieldsTab();
  for (const i in fieldNames) {
    await user.click(screen.queryAllByLabelText(textDelete)[i]);
  }
  const setPropertyNameActions = store.getActions().filter(action => action.type === 'schemaEditor/deleteProperty');
  expect(setPropertyNameActions).toHaveLength(numberOfFields);
  setPropertyNameActions.forEach((action, i) => expect(action.payload.path).toEqual(childNodes[i].pointer));
});

test('Newly added field gets focus and its text becomes selected', async () => {
  const { user, rerenderWithRedux } = renderItemFieldsTab();
  const newChildNodeName = 'Skrue';
  const newChildNode = {
    ...createChildNode(selectedItem, newChildNodeName, false),
    fieldType: FieldType.String,
  };
  const newSelectedItem = { ...selectedItem, children: [...selectedItem.children, newChildNode.pointer] };
  const newUiSchema = [newSelectedItem, ...childNodes, newChildNode];
  rerenderWithRedux(
    <ItemFieldsTab {...defaultProps} selectedItem={newSelectedItem} />,
    { uiSchema: newUiSchema },
  );
  expect(screen.getByDisplayValue(newChildNodeName)).toHaveFocus();
  await user.keyboard('a'); // Should replace the current value since the text should be selected
  expect(screen.getByDisplayValue('a')).toBeDefined();
  expect(screen.queryByDisplayValue(newChildNodeName)).toBeFalsy();
});

test('Inputs are enabled by default', () => {
  renderItemFieldsTab();
  screen.queryAllByRole("textbox").forEach((input) => expect(input).toBeEnabled());
  screen.queryAllByRole("checkbox").forEach((input) => expect(input).toBeEnabled());
});

test('Inputs are disabled if the selected item is a reference', () => {
  const referencedNode = createNodeBase(Keywords.Definitions, 'testtype');
  renderItemFieldsTab(
    { selectedItem: { ...selectedItem, objectKind: ObjectKind.Reference, ref: referencedNode.pointer } },
    { uiSchema: [...uiSchema, referencedNode]},
  );
  screen.queryAllByRole("textbox").forEach((input) => expect(input).toBeDisabled());
  screen.queryAllByRole("checkbox").forEach((input) => expect(input).toBeDisabled());
});
