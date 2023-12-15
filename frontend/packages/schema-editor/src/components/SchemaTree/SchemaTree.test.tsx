import React from 'react';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '../../../../schema-model';
import {
  childOfDefinitionNodeMock,
  definitionNodeMock,
  uiSchemaNodesMock,
} from '../../../test/mocks/uiSchemaMock';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { SchemaTree } from '@altinn/schema-editor/components/SchemaTree/SchemaTree';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

const onAdd = jest.fn();
const onMove = jest.fn();
const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);

describe('SchemaTree', () => {
  afterEach(jest.clearAllMocks);

  it('Renders the top level nodes by default', () => {
    render();
    const topLevelNodes = schemaModel.getRootProperties();
    expect(screen.getAllByRole('treeitem')).toHaveLength(topLevelNodes.length);
  });

  it('Renders a definition node when a pointer to a definition is provided', () => {
    const { pointer } = definitionNodeMock;
    const name = extractNameFromPointer(pointer);
    render(pointer);
    expect(screen.getByRole('treeitem', { name })).toBeInTheDocument();
  });

  it("Renders the definition node's children when a pointer to a definition is provided and the definition is expanded", async () => {
    const { pointer } = definitionNodeMock;
    const name = extractNameFromPointer(pointer);
    const childPointer = childOfDefinitionNodeMock.pointer;
    const childName = extractNameFromPointer(childPointer);
    render(pointer);
    const parentItem = screen.getByRole('treeitem', { name });
    await act(() => user.click(parentItem));
    expect(screen.getByRole('treeitem', { name: childName })).toBeInTheDocument();
  });
});

const render = (pointer?: string) =>
  renderWithProviders()(
    <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={ROOT_POINTER}>
      <SchemaTree pointer={pointer} />
    </DragAndDropTree.Provider>,
  );
