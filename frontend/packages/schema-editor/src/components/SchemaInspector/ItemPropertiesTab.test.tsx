import React from 'react';
import { screen } from '@testing-library/react';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { renderWithRedux } from '../../../test/renderWithRedux';
import type { UiSchemaNodes } from '@altinn/schema-model';
import {
  CombinationKind,
  createChildNode,
  createNodeBase,
  FieldType,
  Keyword,
  ObjectKind,
} from '@altinn/schema-model';
import { textMock } from '../../../../../testing/mocks/i18nMock';

test('item property tab renders combinations', async () => {
  const uiSchemaNodes: UiSchemaNodes = [];
  const selectedNode = createNodeBase(Keyword.Properties, 'test');
  selectedNode.objectKind = ObjectKind.Combination;
  selectedNode.fieldType = CombinationKind.AnyOf;
  uiSchemaNodes.push(selectedNode);
  ['donald', 'dolly'].forEach((childNodeName) => {
    const childNode = createChildNode(selectedNode, childNodeName, false);
    childNode.fieldType = FieldType.String;
    // eslint-disable-next-line testing-library/no-node-access
    selectedNode.children.push(childNode.pointer);
    uiSchemaNodes.push(childNode);
  });

  renderWithRedux(<ItemPropertiesTab selectedItem={uiSchemaNodes[1]} />, {
    uiSchema: uiSchemaNodes,
  });
  expect(screen.getByText(textMock('combination_inline_object_disclaimer'))).toBeDefined();
});
