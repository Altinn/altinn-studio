import React from 'react';
import { FieldNode, FieldType, ObjectKind } from '@altinn/schema-model';
import { screen } from '@testing-library/react';
import { TypeItem } from './TypeItem';
import { renderWithProviders } from '../../../test/renderWithProviders';
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
      <TypeItem setSelectedTypePointer={jest.fn()} uiSchemaNode={uiSchemaNode} />,
    );
    expect(screen.getByText('MyTestType')).toBeInTheDocument();
  });
});
