import React from 'react';
import { screen } from '@testing-library/react';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import type { CombinationNode, FieldNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  CombinationKind,
  ObjectKind,
  SchemaModel,
  validateTestUiSchema,
} from '@altinn/schema-model';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { nodeMockBase, rootNodeMock } from '../../../test/mocks/uiSchemaMock';

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
      pointer: selectedNodePointer,
      children: [],
    };
    const uiSchemaNodes: UiSchemaNodes = [rootNode, selectedNode];
    ['donald', 'dolly'].forEach((childNodeName) => {
      const pointer = `${selectedNodePointer}/${combinationType}/${childNodeName}`;
      const node: FieldNode = {
        ...nodeMockBase,
        pointer,
      };
      selectedNode.children.push(node.pointer); // eslint-disable-line testing-library/no-node-access
      uiSchemaNodes.push(node);
    });
    validateTestUiSchema(uiSchemaNodes);
    renderWithProviders({
      appContextProps: { schemaModel: SchemaModel.fromArray(uiSchemaNodes) },
    })(<ItemPropertiesTab selectedItem={uiSchemaNodes[2]} />);
    expect(screen.getByText(textMock('combination_inline_object_disclaimer'))).toBeDefined();
  });
});
