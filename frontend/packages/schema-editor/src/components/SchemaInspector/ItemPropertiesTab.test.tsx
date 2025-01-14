import React from 'react';
import { screen } from '@testing-library/react';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import type { CombinationNode, FieldNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  CombinationKind,
  FieldType,
  ObjectKind,
  SchemaModel,
  validateTestUiSchema,
} from '@altinn/schema-model';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { nodeMockBase, rootNodeMock } from '../../../test/mocks/uiSchemaMock';
import type { SchemaEditorAppContextProps } from '../../contexts/SchemaEditorAppContext';

describe('ItemPropertiesTab', () => {
  it('Renders combinations', async () => {
    const selectedNodePointer = '#/properties/test';
    const combinationType = CombinationKind.AnyOf;
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [selectedNodePointer],
    };
    const selectedNode: CombinationNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Combination,
      combinationType,
      schemaPointer: selectedNodePointer,
      children: [],
    };
    const uiSchemaNodes: UiSchemaNodes = [rootNode, selectedNode];
    ['0', '1'].forEach((childNodeName) => {
      const schemaPointer = `${selectedNodePointer}/${combinationType}/${childNodeName}`;
      const node: FieldNode = {
        ...nodeMockBase,
        schemaPointer,
      };
      selectedNode.children.push(node.schemaPointer); // eslint-disable-line testing-library/no-node-access
      uiSchemaNodes.push(node);
    });
    validateTestUiSchema(uiSchemaNodes);
    renderWithProviders({
      appContextProps: { schemaModel: SchemaModel.fromArray(uiSchemaNodes) },
    })(<ItemPropertiesTab selectedItem={uiSchemaNodes[2]} />);
    expect(
      screen.getByText(textMock('schema_editor.combination_inline_object_disclaimer')),
    ).toBeDefined();
  });

  it('Renders a name field when a field node is selected', async () => {
    const selectedUniquePointer = '#/properties/test';
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [selectedUniquePointer],
    };
    const selectedNode: FieldNode = {
      ...nodeMockBase,
      objectKind: ObjectKind.Field,
      fieldType: FieldType.String,
      schemaPointer: selectedUniquePointer,
    };
    const nodes = [rootNode, selectedNode];
    validateTestUiSchema(nodes);

    const schemaModel = SchemaModel.fromArray(nodes);
    const appContextProps: Partial<SchemaEditorAppContextProps> = {
      schemaModel,
      selectedUniquePointer,
    };
    renderWithProviders({ appContextProps })(<ItemPropertiesTab selectedItem={selectedNode} />);

    expect(
      screen.getByRole('textbox', { name: textMock('schema_editor.name') }),
    ).toBeInTheDocument();
  });

  it('Does not render a name field when the selected node is the root node', async () => {
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [],
    };
    const nodes = [rootNode];
    validateTestUiSchema(nodes);

    const schemaModel = SchemaModel.fromArray(nodes);
    const appContextProps: Partial<SchemaEditorAppContextProps> = {
      schemaModel,
      selectedUniquePointer: null,
    };
    renderWithProviders({ appContextProps })(<ItemPropertiesTab selectedItem={rootNodeMock} />);

    const name = textMock('schema_editor.name');
    expect(screen.queryByRole('textbox', { name })).not.toBeInTheDocument();
  });
});
