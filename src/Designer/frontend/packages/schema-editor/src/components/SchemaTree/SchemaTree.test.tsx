import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import {
  childOfDefinitionNodeMock,
  definitionNodeMock,
  uiSchemaNodesMock,
} from '../../../test/mocks/uiSchemaMock';
import { StudioDragAndDropTree } from '@studio/components';
import { SchemaTree } from './SchemaTree';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { screen } from '@testing-library/react';

const onAdd = vi.fn();
const onMove = vi.fn();
const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);

describe('SchemaTree', () => {
  afterEach(vi.clearAllMocks);

  it('Renders the top level nodes by default', () => {
    render();
    const topLevelNodes = schemaModel.getRootProperties();
    expect(screen.getAllByRole('treeitem')).toHaveLength(topLevelNodes.length);
  });

  it("Renders the definition node's children when a pointer to a definition is provided", async () => {
    const { schemaPointer } = definitionNodeMock;
    const childPointer = childOfDefinitionNodeMock.schemaPointer;
    const childName = extractNameFromPointer(childPointer);
    render(schemaPointer);
    expect(screen.getByRole('treeitem', { name: childName })).toBeInTheDocument();
  });
});

const render = (schemaPointer?: string) =>
  renderWithProviders()(
    <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={ROOT_POINTER}>
      <SchemaTree schemaPointer={schemaPointer} />
    </StudioDragAndDropTree.Provider>,
  );
