import React from 'react';
import { screen } from '@testing-library/react';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { renderWithRedux } from '../../../test/renderWithRedux';
import {
  CombinationKind,
  createChildNode,
  createNodeBase,
  FieldType,
  Keywords,
  ObjectKind,
  ROOT_POINTER,
} from '@altinn/schema-model';

test('item property tab renders combinations', async () => {
  const checkIsNameInUse = jest.fn();
  const selectedNode = createNodeBase(ROOT_POINTER, Keywords.Properties, 'test');
  selectedNode.objectKind = ObjectKind.Combination;
  selectedNode.fieldType = CombinationKind.AnyOf;

  ['donald', 'dolly'].forEach((childNodeName) => {
    const childNode = createChildNode(selectedNode, childNodeName, false);
    childNode.fieldType = FieldType.String;
    selectedNode.children.push(childNode.pointer);
  });

  renderWithRedux(
    <ItemPropertiesTab
      language={{}}
      selectedItem={selectedNode}
      checkIsNameInUse={checkIsNameInUse}
    />,
  );
  expect(screen.getByText('combination_inline_object_disclaimer')).toBeDefined();
});
