import { render as renderRtl, screen } from '@testing-library/react';
import { renderIcon } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/renderIcon';
import {
  CombinationKind,
  CombinationNode,
  FieldNode,
  FieldType,
  ObjectKind,
  ReferenceNode,
  ROOT_POINTER,
  SchemaModel,
  UiSchemaNode,
  UiSchemaNodes,
  validateTestUiSchema,
} from '../../../../../schema-model';
import { nodeMockBase } from '../../../../test/mocks/uiSchemaMock';

const definitionNodePointer = `${ROOT_POINTER}/$defs/testDef`;
const testNodePointer = `${ROOT_POINTER}/properties/testNode`;
const render = (node: UiSchemaNode) => {
  const rootNode: FieldNode = {
    ...nodeMockBase,
    objectKind: ObjectKind.Field,
    fieldType: FieldType.Object,
    pointer: ROOT_POINTER,
    children: [node.pointer, definitionNodePointer],
  };
  const definitionNode: FieldNode = {
    ...nodeMockBase,
    pointer: definitionNodePointer,
  };
  const nodes: UiSchemaNodes = [rootNode, definitionNode, node];
  validateTestUiSchema(nodes);
  const schemaModel = SchemaModel.fromArray(nodes);
  return renderRtl(renderIcon(schemaModel, node.pointer));
};

describe('renderIcon', () => {
  it('Returns an icon when the node is a combination', () => {
    const node: CombinationNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Combination,
      combinationType: CombinationKind.AnyOf,
      pointer: testNodePointer,
    };
    render(node);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('Returns an icon when the node is a reference', () => {
    const node: ReferenceNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Reference,
      reference: definitionNodePointer,
      pointer: testNodePointer,
    };
    render(node);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it.each([
    FieldType.Boolean,
    FieldType.Integer,
    FieldType.Number,
    FieldType.String,
    FieldType.Null,
  ])('Render an icon when the node is a field of type %s', (fieldType) => {
    const node: FieldNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Field,
      fieldType,
      pointer: testNodePointer,
    };
    render(node);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('Returns null when the node is a field of type object', () => {
    const node: FieldNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Field,
      fieldType: FieldType.Object,
      pointer: testNodePointer,
    };
    render(node);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
