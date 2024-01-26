import type { CombinationNode, ReferenceNode, UiSchemaNode } from '@altinn/schema-model';
import { CombinationKind, FieldType, ObjectKind } from '@altinn/schema-model';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { NodeIconProps } from './';
import { NodeIcon } from './';
import { nodeMockBase } from '../../../test/mocks/uiSchemaMock';

jest.mock('./NodeIcon.module.css', () => ({
  icon: 'icon',
  isArray: 'isArray',
}));

describe('NodeIcon', () => {
  it('Renders an icon when the node is a combination', () => {
    const node: CombinationNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Combination,
      combinationType: CombinationKind.AnyOf,
    };
    renderNodeIcon({ node });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('Renders an icon when the node is a reference', () => {
    const node: ReferenceNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Reference,
      reference: '#/$defs/testDef',
    };
    renderNodeIcon({ node });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it.each([
    FieldType.Boolean,
    FieldType.Integer,
    FieldType.Number,
    FieldType.String,
    FieldType.Null,
  ])('Renders an icon when the node is a field node with type %s ', (fieldType) => {
    const node: UiSchemaNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Field,
      fieldType,
    };
    renderNodeIcon({ node });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('Appends the contents of the className prop to the icon class name', () => {
    const className = 'test-class';
    renderNodeIcon({ node: nodeMockBase, className });
    const iconElement = screen.getByRole('img');
    expect(iconElement).toHaveClass(className);
    expect(iconElement).toHaveClass('icon');
  });

  it('Does not have the isArray class when the node is not an array', () => {
    renderNodeIcon({ node: nodeMockBase });
    expect(screen.getByRole('img')).not.toHaveClass('isArray');
  });

  it('Has the isArray class when the node is an array', () => {
    renderNodeIcon({ node: { ...nodeMockBase, isArray: true } });
    expect(screen.getByRole('img')).toHaveClass('isArray');
  });
});

const renderNodeIcon = (props: NodeIconProps) => render(<NodeIcon {...props} />);
