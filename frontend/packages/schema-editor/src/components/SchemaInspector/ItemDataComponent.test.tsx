import { renderWithRedux } from '../../../test/renderWithRedux';
import type { IItemDataComponentProps } from './ItemDataComponent';
import { ItemDataComponent } from './ItemDataComponent';
import {
  CombinationKind,
  createChildNode,
  createNodeBase,
  FieldType,
  Keyword,
  ObjectKind,
} from '@altinn/schema-model';
import React from 'react';
import { act, screen } from '@testing-library/react';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';

const mockTexts = {
  'schema_editor.description': 'Description',
  'schema_editor.descriptive_fields': 'Descriptive fields',
  'schema_editor.go_to_type': 'Go to type',
  'schema_editor.multiple_answers': 'Multiple answers',
  'schema_editor.name': 'Name',
  'schema_editor.nullable': 'Nullable',
  'schema_editor.reference_to': 'Reference to',
  'schema_editor.title': 'Title',
  'schema_editor.type': 'Type',
};

const parentNode = createNodeBase(Keyword.Properties, 'test');
parentNode.objectKind = ObjectKind.Combination;
parentNode.fieldType = CombinationKind.AnyOf;
const uiSchemaNodes = [parentNode];
['Donald', 'Dolly'].forEach((childNodeName) => {
  const childNode = createChildNode(parentNode, childNodeName, false);
  childNode.fieldType = FieldType.String;
  // eslint-disable-next-line testing-library/no-node-access
  parentNode.children.push(childNode.pointer);
  uiSchemaNodes.push(childNode);
});
const anotherNode = createNodeBase(Keyword.Properties, 'can be toggled');
anotherNode.objectKind = ObjectKind.Field;
anotherNode.fieldType = FieldType.String;
uiSchemaNodes.push(anotherNode);
const renderItemDataComponent = (
  props?: Partial<IItemDataComponentProps>,
  selectedItemIndex?: number
) => {
  return renderWithRedux(
    <ItemDataComponent {...uiSchemaNodes[selectedItemIndex ?? 0]} {...props}>
      {props?.children}
    </ItemDataComponent>,
    { uiSchema: uiSchemaNodes }
  );
};

// Mocks:
jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation(mockTexts),
}));

describe('ItemDataComponent', () => {
  test('"Multiple answers" checkbox should appear if selected item is field', async () => {
    renderItemDataComponent({}, 1);
    expect(await screen.findByLabelText(mockTexts['schema_editor.multiple_answers'])).toBeDefined();
  });

  test('"Multiple answers" checkbox should not appear if selected item is combination', async () => {
    renderItemDataComponent({}, 0);
    await screen.findByLabelText(mockTexts['schema_editor.name']);
    expect(screen.queryByLabelText(mockTexts['schema_editor.multiple_answers'])).toBeNull()
  });

  test('setType is called when "multiple answers" checkbox is checked', async () => {
    const { store, user } = renderItemDataComponent({}, 3);
    const checkbox = screen.queryByLabelText(mockTexts['schema_editor.multiple_answers']);
    if (checkbox === null) fail();
    await act(() => user.click(checkbox));
    expect(
      store.getActions().some(({ type }) => type === 'schemaEditor/toggleArrayField')
    ).toBeTruthy();
  });

  test('"Nullable" checkbox should appear if selected item is combination', async () => {
    renderItemDataComponent({}, 0);
    expect(await screen.findByLabelText(mockTexts['schema_editor.nullable'])).toBeDefined();
  });

  test('"Nullable" checkbox should not appear if selected item is not combination', async () => {
    renderItemDataComponent({}, 1);
    await screen.findAllByRole('combobox');
    expect(screen.queryByLabelText(mockTexts['schema_editor.nullable'])).toBeNull();
  });

  test('addCombinationItem is called when "nullable" checkbox is checked', async () => {
    const { store, user } = renderItemDataComponent({}, 0);
    const checkbox = screen.getByLabelText(mockTexts['schema_editor.nullable']);
    if (checkbox === null) fail();
    await act(() => user.click(checkbox));
    expect(
      store.getActions().some(({ type }) => type === 'schemaEditor/addCombinationItem')
    ).toBeTruthy();
  });

  test('"Title" field appears', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(mockTexts['schema_editor.title'])).toBeDefined();
  });

  test('setTitle action is called with correct payload when the "title" field loses focus', async () => {
    const { store, user } = renderItemDataComponent();
    const inputField = screen.getByLabelText(mockTexts['schema_editor.title']);
    await act(() => user.type(inputField, 'Lorem ipsum'));
    await act(() => user.tab());
    const setTitleActions = store
      .getActions()
      .filter(({ type }) => type === 'schemaEditor/setTitle');
    expect(setTitleActions).toHaveLength(1);
    expect(setTitleActions[0].payload.title).toEqual('Lorem ipsum');
  });

  test('"Description" text area appears', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(mockTexts['schema_editor.description'])).toBeDefined();
  });

  test('setDescription action is called with correct payload when the "description" text area loses focus', async () => {
    const { store, user } = renderItemDataComponent();
    const textArea = screen.getByLabelText(mockTexts['schema_editor.description']);
    await act(() => user.type(textArea, 'Lorem ipsum dolor sit amet.'));
    await act(() => user.tab());
    const setDescriptionActions = store
      .getActions()
      .filter(({ type }) => type === 'schemaEditor/setDescription');
    expect(setDescriptionActions).toHaveLength(1);
    expect(setDescriptionActions[0].payload.description).toEqual('Lorem ipsum dolor sit amet.');
  });
});
