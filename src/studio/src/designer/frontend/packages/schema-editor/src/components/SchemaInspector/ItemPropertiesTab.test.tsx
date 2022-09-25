import React from 'react';
import { screen } from '@testing-library/react';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { FieldType, UiSchemaNode } from '@altinn/schema-model';

test('item property tab renders combinations', async () => {
  const checkIsNameInUse = jest.fn();
  const selectedItem: UiSchemaNode = {
    fieldType: FieldType.Object,
    pointer: '#/properties/test',
    displayName: 'test',
    combinationItem: true,
    combinationKind: CombinationKind.AnyOf,
    combination: [
      {
        type: FieldType.String,
        path: '#/properties/test/donald',
        displayName: 'donald',
      },
      {
        type: FieldType.String,
        path: '#/properties/test/dolly',
        displayName: 'dolly',
      },
    ],
  };
  renderWithRedux(
    <ItemPropertiesTab
      language={{}}
      selectedItem={selectedItem}
      checkIsNameInUse={checkIsNameInUse}
    />,
  );
  expect(screen.getByText('combination_inline_object_disclaimer')).toBeDefined();
});
