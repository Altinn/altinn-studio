import { renderWithProviders } from '../../../../test/renderWithProviders';
import { StudioDragAndDropTree } from '@studio/components';
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
  referenceNodeMock,
  referredNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';
import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { getSavedModel } from '../../../../test/test-utils';

const user = userEvent.setup();
const setupSchemaModel = () => SchemaModel.fromArray(uiSchemaNodesMock).deepClone();

/* eslint-disable testing-library/no-node-access */ // Disabled because Eslint misinterprets the "children" properties as React children
describe('SchemaNode', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a node', () => {
    const { schemaPointer } = objectNodeMock;
    const name = extractNameFromPointer(schemaPointer);
    render({ schemaPointer });
    expect(screen.getByRole('treeitem', { name })).toBeInTheDocument();
  });

  it('Saves the model correctly when a text node is added', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    const numberOfChildren = objectNodeMock.children.length;
    render({ schemaModel, save, schemaPointer });
    await user.click(getAddNodeInChildButton());
    const addTextButtonName = textMock('schema_editor.add_string');
    const addTextButton = screen.getByRole('button', { name: addTextButtonName });
    await user.click(addTextButton);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNodeBySchemaPointer(schemaPointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfChildren + 1);
  });

  it('Saves the model correctly when a combination node is added', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    const numberOfChildren = objectNodeMock.children.length;
    render({ schemaModel, save, schemaPointer });
    await user.click(getAddNodeInChildButton());
    const addCombinationButtonName = textMock('schema_editor.add_combination');
    const addCombinationButton = screen.getByRole('button', { name: addCombinationButtonName });
    await user.click(addCombinationButton);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNodeBySchemaPointer(schemaPointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfChildren + 1);
  });

  it('Saves the model correctly when a reference node is added', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    const numberOfChildren = objectNodeMock.children.length;
    const definitionPointer = definitionNodeMock.schemaPointer;
    const definitionName = extractNameFromPointer(definitionPointer);
    jest.spyOn(window, 'prompt').mockImplementation(() => definitionName);
    render({ schemaModel, save, schemaPointer });
    await user.click(getAddNodeInChildButton());
    const addReferenceButtonName = textMock('schema_editor.add_reference');
    const addReferenceButton = screen.getByRole('button', { name: addReferenceButtonName });
    await user.click(addReferenceButton);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNodeBySchemaPointer(schemaPointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfChildren + 1);
  });

  it('Renders the delete button as disabled when the node is a definition in use', async () => {
    const { schemaPointer } = referredNodeMock;
    render({ schemaPointer });
    const deleteButtonTitle = textMock('schema_editor.disable_deletion_info_for_used_definition');
    const deleteButton = screen.getByRole('button', { name: deleteButtonTitle });
    expect(deleteButton).toBeDisabled();
  });

  it('Renders the delete button as enabled when the node is an unused definition', async () => {
    const { schemaPointer } = definitionNodeMock;
    render({ schemaPointer });
    const deleteButtonTitle = textMock('general.delete');
    const deleteButton = screen.getByRole('button', { name: deleteButtonTitle });
    expect(deleteButton).toBeEnabled();
  });

  it('Enables the deletion of a child node from a definition that is currently in use', async () => {
    const { schemaPointer } = referenceNodeMock;
    const save = jest.fn();
    render({ schemaPointer, save });

    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    await user.click(deleteButton);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('Saves the model correctly when a node is deleted', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    render({ schemaModel, save, schemaPointer });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    expect(savedModel.hasNode(schemaPointer)).toBe(false);
  });

  it('Does not change anything when the user denies deletion', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const schemaModelBefore = schemaModel.deepClone();
    const save = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    render({ schemaModel, save, schemaPointer });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);
    expect(save).not.toHaveBeenCalled();
    expect(schemaModel.getNodeMap()).toEqual(schemaModelBefore.getNodeMap());
  });

  it('Saves the model correctly when a node is converted to a type', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    render({ schemaModel, save, schemaPointer });
    const promoteButton = screen.getByRole('button', { name: textMock('schema_editor.promote') });
    await user.click(promoteButton);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNodeBySchemaPointer(schemaPointer);
    expect(updatedNode.objectKind).toEqual(ObjectKind.Reference);
  });

  it('Removes node selection when the node is selected and deleted', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const setSelectedUniquePointer = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    render({
      schemaModel,
      schemaPointer,
      selectedUniquePointer: schemaPointer,
      setSelectedUniquePointer,
    });
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);
    expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointer).toHaveBeenCalledWith(null);
  });

  it('Marks the node as selected when it is added', async () => {
    const { schemaPointer } = objectNodeMock;
    const schemaModel = setupSchemaModel();
    const save = jest.fn();
    render({ schemaModel, save, schemaPointer });
    await user.click(getAddNodeInChildButton());
    const addTextButtonName = textMock('schema_editor.add_string');
    const addTextButton = screen.getByRole('button', { name: addTextButtonName });
    await user.click(addTextButton);
    const savedModel = getSavedModel(save);
    const updatedNode = savedModel.getNodeBySchemaPointer(schemaPointer) as FieldNode;
    expect(updatedNode.schemaPointer).toEqual(schemaPointer);
  });
});

interface RenderProps {
  schemaPointer?: string;
  schemaModel?: SchemaModel;
  save?: (model: SchemaModel) => void;
  selectedUniquePointer?: string;
  setSelectedUniquePointer?: (schemaPointer?: string) => void;
}

const render = ({
  schemaPointer = objectNodeMock.schemaPointer,
  schemaModel = SchemaModel.fromArray(uiSchemaNodesMock),
  save = jest.fn(),
  selectedUniquePointer = null,
  setSelectedUniquePointer = jest.fn(),
}: RenderProps) => {
  const onAdd = jest.fn();
  const onMove = jest.fn();
  return renderWithProviders({
    appContextProps: { save, schemaModel, selectedUniquePointer, setSelectedUniquePointer },
  })(
    <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={ROOT_POINTER}>
      <StudioDragAndDropTree.Root>
        <SchemaNode schemaPointer={schemaPointer} />
      </StudioDragAndDropTree.Root>
    </StudioDragAndDropTree.Provider>,
  );
};

const getAddNodeInChildButton = () =>
  screen.getByRole('button', {
    name: textMock('schema_editor.add_property'),
  });
