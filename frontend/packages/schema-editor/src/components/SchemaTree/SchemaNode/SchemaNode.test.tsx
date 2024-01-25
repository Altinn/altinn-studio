import { renderWithProviders } from '../../../../test/renderWithProviders';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { SchemaNode } from './SchemaNode';
import { userEvent } from '@testing-library/user-event';
import type { FieldNode } from '@altinn/schema-model';
import {
  extractNameFromPointer,
  ObjectKind,
  ROOT_POINTER,
  SchemaModel,
} from '@altinn/schema-model';
import {
  definitionNodeMock,
  objectNodeMock,
  referredNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';
import React from 'react';
import { act, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { getSavedModel } from '../../../../test/test-utils';

const user = userEvent.setup();
const setupSchemaModel = () => SchemaModel.fromArray(uiSchemaNodesMock).deepClone();

/* eslint-disable testing-library/no-node-access */ // Disabled because Eslint misinterprets the "children" properties as React children
describe('SchemaNode', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a node', () => {
    const { pointer } = objectNodeMock;
    const name = extractNameFromPointer(pointer);
    render({ pointer });
    expect(screen.getByRole('treeitem', { name })).toBeInTheDocument();
  });

  it('Saves the model correctly when a field node is added', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    const numberOfChildren = objectNodeMock.children.length;
    render({ schemaModel, save, pointer });
    await act(() => user.click(getAddButton()));
    const addFieldButtonName = textMock('schema_editor.add_field');
    const addFieldButton = screen.getByRole('menuitem', { name: addFieldButtonName });
    await act(() => user.click(addFieldButton));
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNode(pointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfChildren + 1);
  });

  it('Saves the model correctly when a combination node is added', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    const numberOfChildren = objectNodeMock.children.length;
    render({ schemaModel, save, pointer });
    await act(() => user.click(getAddButton()));
    const addCombinationButtonName = textMock('schema_editor.add_combination');
    const addCombinationButton = screen.getByRole('menuitem', { name: addCombinationButtonName });
    await act(() => user.click(addCombinationButton));
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNode(pointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfChildren + 1);
  });

  it('Saves the model correctly when a reference node is added', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    const numberOfChildren = objectNodeMock.children.length;
    const definitionPointer = definitionNodeMock.pointer;
    const definitionName = extractNameFromPointer(definitionPointer);
    jest.spyOn(window, 'prompt').mockImplementation(() => definitionName);
    render({ schemaModel, save, pointer });
    await act(() => user.click(getAddButton()));
    const addReferenceButtonName = textMock('schema_editor.add_reference');
    const addReferenceButton = screen.getByRole('menuitem', { name: addReferenceButtonName });
    await act(() => user.click(addReferenceButton));
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNode(pointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfChildren + 1);
  });

  it('Renders the delete button as disabled when the node is a definition in use', async () => {
    const { pointer } = referredNodeMock;
    render({ pointer });
    const deleteButtonTitle = textMock('schema_editor.disable_deletion_info_for_used_definition');
    const deleteButton = screen.getByRole('button', { name: deleteButtonTitle });
    expect(deleteButton).toBeDisabled();
  });

  it('Renders the delete button as enabled when the node is an unused definition', async () => {
    const { pointer } = definitionNodeMock;
    render({ pointer });
    const deleteButtonTitle = textMock('general.delete');
    const deleteButton = screen.getByRole('button', { name: deleteButtonTitle });
    expect(deleteButton).toBeEnabled();
  });

  it('Saves the model correctly when a node is deleted', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    render({ schemaModel, save, pointer });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    expect(savedModel.hasNode(pointer)).toBe(false);
  });

  it('Does not change anything when the user denies deletion', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const schemaModelBefore = schemaModel.deepClone();
    const save = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    render({ schemaModel, save, pointer });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    expect(save).not.toHaveBeenCalled();
    expect(schemaModel.getNodeMap()).toEqual(schemaModelBefore.getNodeMap());
  });

  it('Saves the model correctly when a node is converted to a type', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    render({ schemaModel, save, pointer });
    const promoteButton = screen.getByRole('button', { name: textMock('schema_editor.promote') });
    await act(() => user.click(promoteButton));
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNode(pointer);
    expect(updatedNode.objectKind).toEqual(ObjectKind.Reference);
  });

  it('Removes node selection when the node is selected and deleted', async () => {
    const { pointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const setSelectedNodePointer = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    render({ schemaModel, pointer, selectedNodePointer: pointer, setSelectedNodePointer });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedNodePointer).toHaveBeenCalledWith(null);
  });
});

interface RenderProps {
  pointer?: string;
  schemaModel?: SchemaModel;
  save?: (model: SchemaModel) => void;
  selectedNodePointer?: string;
  setSelectedNodePointer?: (pointer?: string) => void;
}

const render = ({
  pointer = objectNodeMock.pointer,
  schemaModel = SchemaModel.fromArray(uiSchemaNodesMock),
  save = jest.fn(),
  selectedNodePointer = null,
  setSelectedNodePointer = jest.fn(),
}: RenderProps) => {
  const onAdd = jest.fn();
  const onMove = jest.fn();
  return renderWithProviders({
    appContextProps: { save, schemaModel, selectedNodePointer, setSelectedNodePointer },
  })(
    <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={ROOT_POINTER}>
      <DragAndDropTree.Root>
        <SchemaNode pointer={pointer} />
      </DragAndDropTree.Root>
    </DragAndDropTree.Provider>,
  );
};

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('schema_editor.add_node_of_type') });
