import { ItemDataComponent } from './ItemDataComponent';
import type { UiSchemaNode } from '@altinn/schema-model/index';
import { SchemaModel } from '@altinn/schema-model/index';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  fieldNode1Mock,
  nodeWithCustomPropsMock,
  combinationNodeMock,
  toggableNodeMock,
  uiSchemaNodesMock,
} from '../../../test/mocks/uiSchemaMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { getSavedModel } from '../../../test/test-utils';

const user = userEvent.setup();

// Test data:
const saveDataModel = jest.fn();
const defaultNode: UiSchemaNode = combinationNodeMock;

const renderItemDataComponent = (schemaNode: UiSchemaNode = defaultNode) => {
  const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
  return renderWithProviders({
    appContextProps: {
      schemaModel,
      save: saveDataModel,
      selectedUniquePointer: schemaNode.schemaPointer,
    },
  })(<ItemDataComponent schemaNode={schemaNode} />);
};

describe('ItemDataComponent', () => {
  afterEach(jest.clearAllMocks);

  test('"Multiple answers" checkbox should appear if selected item is field', async () => {
    renderItemDataComponent(fieldNode1Mock);
    expect(await screen.findByLabelText(textMock('schema_editor.multiple_answers'))).toBeDefined();
  });

  test('"Multiple answers" checkbox should not appear if selected item is combination', async () => {
    renderItemDataComponent();
    await screen.findByLabelText(textMock('schema_editor.name'));
    expect(screen.queryByLabelText(textMock('schema_editor.multiple_answers'))).toBeNull();
  });

  test('Model is saved when "multiple answers" checkbox is checked', async () => {
    renderItemDataComponent(toggableNodeMock);
    const checkbox = screen.queryByLabelText(textMock('schema_editor.multiple_answers'));
    if (checkbox === null) fail();
    await user.click(checkbox);
    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  test('"Nullable" checkbox should appear if selected item is combination', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(textMock('schema_editor.nullable'))).toBeDefined();
  });

  test('"Nullable" checkbox should not appear if selected item is not combination', async () => {
    renderItemDataComponent(fieldNode1Mock);
    await screen.findAllByRole('combobox');
    expect(screen.queryByLabelText(textMock('schema_editor.nullable'))).toBeNull();
  });

  test('Model is saved when "nullable" checkbox is checked', async () => {
    renderItemDataComponent();
    const checkbox = screen.getByLabelText(textMock('schema_editor.nullable'));
    if (checkbox === null) fail();
    await user.click(checkbox);
    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  test('"Title" field appears', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(textMock('schema_editor.title'))).toBeDefined();
  });

  test('Model is saved correctly when the "title" field loses focus', async () => {
    renderItemDataComponent();
    const inputField = screen.getByLabelText(textMock('schema_editor.title'));
    const title = 'Lorem ipsum';
    await user.type(inputField, title);
    await user.tab();
    expect(saveDataModel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDataModel);
    const updatedNode = updatedModel.getNodeBySchemaPointer(combinationNodeMock.schemaPointer);
    expect(updatedNode.title).toEqual(title);
  });

  test('"Description" text area appears', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(textMock('schema_editor.description'))).toBeDefined();
  });

  test('Model is saved correctly when the "description" text area loses focus', async () => {
    renderItemDataComponent();
    const textArea = screen.getByLabelText(textMock('schema_editor.description'));
    const description = 'Lorem ipsum dolor sit amet.';
    await user.type(textArea, description);
    await user.tab();
    expect(saveDataModel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDataModel);
    const updatedNode = updatedModel.getNodeBySchemaPointer(combinationNodeMock.schemaPointer);
    expect(updatedNode.description).toEqual(description);
  });

  it('Does not render custom properties section if there are no custom properties', async () => {
    renderItemDataComponent();
    await screen.findByText(textMock('schema_editor.title'));
    expect(screen.queryAllByText(textMock('schema_editor.custom_props'))).toHaveLength(0);
  });

  it('Renders custom properties section if there are custom properties', async () => {
    renderItemDataComponent(nodeWithCustomPropsMock);
    expect(await screen.findByText(textMock('schema_editor.custom_props'))).toBeInTheDocument();
  });

  test('Does not render an error message when there is no change in text', async () => {
    renderItemDataComponent();
    const inputField = screen.getByLabelText(textMock('schema_editor.name'));
    await user.type(inputField, 'test');
    fireEvent.blur(inputField);
    expect(screen.queryByText(textMock('schema_editor.nameError_alreadyInUse'))).toBeNull();
  });
});
