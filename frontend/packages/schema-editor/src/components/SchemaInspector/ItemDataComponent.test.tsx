import type { IItemDataComponentProps } from './ItemDataComponent';
import { ItemDataComponent } from './ItemDataComponent';
import { getNodeByPointer, UiSchemaNode } from '@altinn/schema-model';
import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { SchemaState } from '@altinn/schema-editor/types';
import { deepCopy } from 'app-shared/pure';
import {
  fieldNode1Mock,
  nodeWithCustomPropsMock,
  parentNodeMock,
  toggableNodeMock,
  uiSchemaNodesMock,
} from '../../../test/mocks/uiSchemaMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import { getSavedModel } from '../../../test/test-utils';

const user = userEvent.setup();

// Test utils:
const convertNodeToProps = (node: UiSchemaNode): IItemDataComponentProps => {
  const props = deepCopy(node);
  delete props.children;
  return props;
};

// Test data:
const org = 'org';
const app = 'app';
const modelPath = 'test';
const saveDatamodel = jest.fn();
const defaultProps: IItemDataComponentProps = convertNodeToProps(parentNodeMock);
const defaultState: Partial<SchemaState> = {
  selectedEditorTab: 'properties',
  selectedPropertyNodeId: parentNodeMock.pointer,
};

const renderItemDataComponent = (
  props: Partial<IItemDataComponentProps> = {},
  state: Partial<SchemaState> = {}
) => {

  queryClientMock.setQueryData(
    [QueryKey.Datamodel, org, app, modelPath],
    uiSchemaNodesMock,
  );

  return renderWithProviders({
    state: { ...defaultState, ...state },
    selectedSchemaProps: { modelPath },
    servicesContextProps: { saveDatamodel },
  })(<ItemDataComponent {...defaultProps} {...props}/>)
};

describe('ItemDataComponent', () => {
  afterEach(jest.clearAllMocks);

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

  test('Model is saved when "multiple answers" checkbox is checked', async () => {
    renderItemDataComponent(
      convertNodeToProps(toggableNodeMock),
      { selectedPropertyNodeId: toggableNodeMock.pointer }
    );
    const checkbox = screen.queryByLabelText(textMock('schema_editor.multiple_answers'));
    if (checkbox === null) fail();
    await act(() => user.click(checkbox));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
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

  test('Model is saved when "nullable" checkbox is checked', async () => {
    renderItemDataComponent();
    const checkbox = screen.getByLabelText(textMock('schema_editor.nullable'));
    if (checkbox === null) fail();
    await act(() => user.click(checkbox));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  test('"Title" field appears', async () => {
    renderItemDataComponent();
    expect(await screen.findByLabelText(textMock('schema_editor.title'))).toBeDefined();
  });

  test('Model is saved correctly when the "title" field loses focus', async () => {
    renderItemDataComponent();
    const inputField = screen.getByLabelText(textMock('schema_editor.title'));
    const title = 'Lorem ipsum';
    await act(() => user.type(inputField, title));
    await act(() => user.tab());
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = getNodeByPointer(updatedModel, parentNodeMock.pointer);
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
    await act(() => user.type(textArea, description));
    await act(() => user.tab());
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = getNodeByPointer(updatedModel, parentNodeMock.pointer);
    expect(updatedNode.description).toEqual(description);
  });

  it('Does not render custom properties section if there are no custom properties', async () => {
    renderItemDataComponent();
    await screen.findByText(textMock('schema_editor.title'));
    expect(screen.queryAllByText(textMock('schema_editor.custom_props'))).toHaveLength(0);
  });

  it('Renders custom properties section if there are custom properties', async () => {
    renderItemDataComponent(
      convertNodeToProps(nodeWithCustomPropsMock),
      { selectedPropertyNodeId: nodeWithCustomPropsMock.pointer }
    );
    expect(await screen.findByText(textMock('schema_editor.custom_props'))).toBeInTheDocument();
  });

  test('should handleChangeNodeName prevent showing an error message when there is no changing in text', async () => {
    renderItemDataComponent();
    const inputField = screen.getByLabelText(textMock('schema_editor.name'));
    await act(() => user.type(inputField, 'test'));
    fireEvent.blur(inputField);
    expect(screen.queryByText(textMock('schema_editor.nameError_alreadyInUse'))).toBeNull();
  });

});
