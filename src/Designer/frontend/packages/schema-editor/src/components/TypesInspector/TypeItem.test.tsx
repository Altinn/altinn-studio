import React from 'react';
import type { FieldNode } from '@altinn/schema-model/index';
import { FieldType, ObjectKind, ROOT_POINTER } from '@altinn/schema-model/index';
import { screen } from '@testing-library/react';
import { TypeItem } from './TypeItem';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { StudioDragAndDropTree } from '@studio/components-legacy';

describe('TypeItem', () => {
  const uiSchemaNode: FieldNode = {
    children: [],
    custom: null,
    fieldType: FieldType.Object,
    implicitType: false,
    isArray: false,
    isNillable: false,
    isRequired: false,
    objectKind: ObjectKind.Field,
    schemaPointer: '#/$defs/MyTestType',
    restrictions: null,
  };
  it('should render the component', () => {
    renderWithProviders()(
      <StudioDragAndDropTree.Provider onAdd={jest.fn()} onMove={jest.fn()} rootId={ROOT_POINTER}>
        <TypeItem setSelectedTypePointer={jest.fn()} uiSchemaNode={uiSchemaNode} />
      </StudioDragAndDropTree.Provider>,
    );
    expect(screen.getByText('MyTestType')).toBeInTheDocument();
  });
});
