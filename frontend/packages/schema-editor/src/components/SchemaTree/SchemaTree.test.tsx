import React from 'react';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import {
  childOfDefinitionNodeMock,
  definitionNodeMock,
  uiSchemaNodesMock,
} from '../../../test/mocks/uiSchemaMock';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { SchemaTree } from './SchemaTree';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { screen } from '@testing-library/react';

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

  it("Renders the definition node's children when a pointer to a definition is provided", async () => {
    const { pointer } = definitionNodeMock;
    const childPointer = childOfDefinitionNodeMock.pointer;
    const childName = extractNameFromPointer(childPointer);
    render(pointer);
    expect(screen.getByRole('treeitem', { name: childName })).toBeInTheDocument();
  });
});

const render = (pointer?: string) =>
  renderWithProviders()(
    <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={ROOT_POINTER}>
      <SchemaTree pointer={pointer} />
    </DragAndDropTree.Provider>,
  );
