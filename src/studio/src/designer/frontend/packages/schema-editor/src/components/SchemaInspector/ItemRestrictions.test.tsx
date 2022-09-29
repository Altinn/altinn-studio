import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { ItemRestrictions } from './ItemRestrictions';
import { createNodeBase, FieldType, Keywords } from '@altinn/schema-model';

test('item restrictions require checkbox to work', async () => {
  const item = Object.assign(createNodeBase(Keywords.Properties, 'test'), {
    fieldType: FieldType.String,
  });
  const { user, store } = renderWithRedux(<ItemRestrictions language={{}} item={item} />);
  await user.click(screen.getByRole('checkbox'));
  const action = store.getActions().pop();
  expect(action.type).toBe('schemaEditor/setRequired');
  expect(action.payload.required).toBeTruthy();
});

test('item restrictions tab require checkbox to decheck', async () => {
  const item = Object.assign(createNodeBase(Keywords.Properties, 'test'), {
    fieldType: FieldType.String,
    isRequired: true,
  });
  const { user, store } = renderWithRedux(<ItemRestrictions language={{}} item={item} />);
  await user.click(screen.getByRole('checkbox'));
  const action = store.getActions().pop();
  expect(action.type).toBe('schemaEditor/setRequired');
  expect(action.payload.required).toBeFalsy();
});
