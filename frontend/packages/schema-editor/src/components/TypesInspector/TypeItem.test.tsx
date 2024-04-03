import React from 'react';
import type { FieldNode } from '@altinn/schema-model';
import { FieldType, ObjectKind, ROOT_POINTER } from '@altinn/schema-model';
import { screen } from '@testing-library/react';
import { TypeItem } from './TypeItem';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

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
    pointer: '#/$defs/MyTestType',
    restrictions: null,
  };
  it('should render the component', () => {
    renderWithProviders()(
      <DragAndDropTree.Provider onAdd={jest.fn()} onMove={jest.fn()} rootId={ROOT_POINTER}>
        <TypeItem setSelectedTypePointer={jest.fn()} uiSchemaNode={uiSchemaNode} />
      </DragAndDropTree.Provider>,
    );
    expect(screen.getByText('MyTestType')).toBeInTheDocument();
  });
});
