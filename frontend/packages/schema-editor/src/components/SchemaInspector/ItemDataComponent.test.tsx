import { renderWithRedux } from '../../../test/renderWithRedux';
import type { IItemDataComponentProps } from './ItemDataComponent';
import { ItemDataComponent } from './ItemDataComponent';
import { UiSchemaNode } from '@altinn/schema-model';
import React from 'react';
import { act, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { SchemaState } from '@altinn/schema-editor/types';
import { deepCopy } from 'app-shared/pure';
import {
  fieldNode1Mock,
  nodeWithCustomPropsMock,
  parentNodeMock,
  toggableNodeMock,
  uiSchemaNodesMock,
} from '../../../test/uiSchemaMock';

// Test utils:
const convertNodeToProps = (node: UiSchemaNode): IItemDataComponentProps => {
  const props = deepCopy(node);
  delete props.children;
  return props;
};

// Test data:
const defaultProps: IItemDataComponentProps = convertNodeToProps(parentNodeMock);
const defaultState: Partial<SchemaState> = {
  uiSchema: uiSchemaNodesMock,
  selectedEditorTab: 'properties',
  selectedPropertyNodeId: parentNodeMock.pointer,
};
const renderItemDataComponent = (
  props: Partial<IItemDataComponentProps> = {},
  state: Partial<SchemaState> = {}
) => renderWithRedux(
  <ItemDataComponent {...defaultProps} {...props}/>,
  { ...defaultState, ...state }
);

describe('ItemDataComponent', () => {
  test('"Multiple answers" checkbox should appear if selected item is field', async () => {
    renderItemDataComponent(
      convertNodeToProps(fieldNode1Mock),
      { selectedPropertyNodeId: fieldNode1Mock.pointer }
    );
    expect(await screen.findByLabelText(textMock('schema_editor.multiple_answers'))).toBeDefined();
  });

  test('"Multiple answers" checkbox should not appear if selected item is combination', async () => {
    renderItemDataComponent();
    await screen.findByLabelText(textMock('schema_editor.name'));
    expect(screen.queryByLabelText(textMock('schema_editor.multiple_answers'))).toBeNull()
  });

  test('setType is called when "multiple answers" checkbox is checked', async () => {
    const { store, user } = renderItemDataComponent(
      convertNodeToProps(toggableNodeMock),
      { selectedPropertyNodeId: toggableNodeMock.pointer }
    );
    const checkbox = screen.queryByLabelText(textMock('schema_editor.multiple_answers'));
    if (checkbox === null) fail();
    await act(() => user.click(checkbox));
    expect(
      store.getActions().some(({ type }) => type === 'schemaEditor/toggleArrayField')
    ).toBeTruthy();
  });

  test('"Nullable" checkbox should appear if selected item is combination', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(textMock('schema_editor.nullable'))).toBeDefined();
  });

  test('"Nullable" checkbox should not appear if selected item is not combination', async () => {
    renderItemDataComponent(
      convertNodeToProps(fieldNode1Mock),
      { selectedPropertyNodeId: fieldNode1Mock.pointer }
    );
    await screen.findAllByRole('combobox');
    expect(screen.queryByLabelText(textMock('schema_editor.nullable'))).toBeNull();
  });

  test('addCombinationItem is called when "nullable" checkbox is checked', async () => {
    const { store, user } = renderItemDataComponent();
    const checkbox = screen.getByLabelText(textMock('schema_editor.nullable'));
    if (checkbox === null) fail();
    await act(() => user.click(checkbox));
    expect(
      store.getActions().some(({ type }) => type === 'schemaEditor/addCombinationItem')
    ).toBeTruthy();
  });

  test('"Title" field appears', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(textMock('schema_editor.title'))).toBeDefined();
  });

  test('setTitle action is called with correct payload when the "title" field loses focus', async () => {
    const { store, user } = renderItemDataComponent();
    const inputField = screen.getByLabelText(textMock('schema_editor.title'));
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
    expect(await screen.findByLabelText(textMock('schema_editor.description'))).toBeDefined();
  });

  test('setDescription action is called with correct payload when the "description" text area loses focus', async () => {
    const { store, user } = renderItemDataComponent();
    const textArea = screen.getByLabelText(textMock('schema_editor.description'));
    await act(() => user.type(textArea, 'Lorem ipsum dolor sit amet.'));
    await act(() => user.tab());
    const setDescriptionActions = store
      .getActions()
      .filter(({ type }) => type === 'schemaEditor/setDescription');
    expect(setDescriptionActions).toHaveLength(1);
    expect(setDescriptionActions[0].payload.description).toEqual('Lorem ipsum dolor sit amet.');
  });

  it('Does not render custom properties section if there are no custom properties', () => {
    renderItemDataComponent();
    expect(screen.queryByText(textMock('schema_editor.custom_props'))).not.toBeInTheDocument();
  });

  it('Renders custom properties section if there are custom properties', () => {
    renderItemDataComponent(
      convertNodeToProps(nodeWithCustomPropsMock),
      { selectedPropertyNodeId: nodeWithCustomPropsMock.pointer }
    );
    expect(screen.getByText(textMock('schema_editor.custom_props'))).toBeInTheDocument();
  });
});
