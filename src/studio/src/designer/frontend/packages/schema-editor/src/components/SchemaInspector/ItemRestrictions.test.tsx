import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { ItemRestrictions } from './ItemRestrictions';
import { FieldType } from '../../types';

test('item restrictions require checkbox to work', async () => {
  const { user, store } = renderWithRedux(
    <ItemRestrictions
      language={{}}
      item={{
        type: FieldType.String,
        path: '#/properties/test',
        displayName: 'test',
      }}
    />,
  );
  await user.click(screen.getByRole('checkbox'));
  const action = store.getActions().pop();
  expect(action.type).toBe('schemaEditor/setRequired');
  expect(action.payload.required).toBeTruthy();
});

test('item restrictions tab require checkbox to decheck', async () => {
  const { user, store } = renderWithRedux(
    <ItemRestrictions
      language={{}}
      item={{
        type: FieldType.String,
        path: '#/properties/test',
        displayName: 'test',
        isRequired: true,
      }}
    />,
  );
  await user.click(screen.getByRole('checkbox'));
  const action = store.getActions().pop();
  expect(action.type).toBe('schemaEditor/setRequired');
  expect(action.payload.required).toBeFalsy();
});
