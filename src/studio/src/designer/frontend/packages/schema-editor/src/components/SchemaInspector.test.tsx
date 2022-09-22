import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { SchemaInspector } from './SchemaInspector';
import { dataMock } from '../mockData';
import {
  buildUISchema,
  getUiSchemaItem,
  resetUniqueNumber,
} from '../utils/schema';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldType, UiSchemaItem } from '../types';

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const getMockSchemaByPath = (selectedId: string): UiSchemaItem => {
  const mockUiSchema = buildUISchema(dataMock.definitions, '#/definitions');
  return getUiSchemaItem(mockUiSchema, selectedId);
};

const renderSchemaInspector = (selectedItem?: UiSchemaItem) => {
  resetUniqueNumber();
  const store = configureStore()({});
  const user = userEvent.setup();
  act(() => {
    render(
      <Provider store={store}>
        <SchemaInspector
          language={{}}
          checkIsNameInUse={() => false}
          selectedItem={selectedItem}
        />
      </Provider>,
    );
  });
  return { store, user };
};

test('dispatches correctly when entering text in textboxes', async () => {
  const { store, user } = renderSchemaInspector(
    getMockSchemaByPath('#/definitions/Kommentar2000Restriksjon'),
  );
  expect(screen.getByTestId('schema-inspector')).toBeDefined();
  const tablist = screen.getByRole('tablist');
  expect(tablist).toBeDefined();
  const tabpanel = screen.getByRole('tabpanel');
  expect(tabpanel).toBeDefined();
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  const textboxes = screen.getAllByRole('textbox');
  let textboxIndex = 0;
  while (textboxes[textboxIndex]) {
    await user.clear(textboxes[textboxIndex]);
    await user.type(textboxes[textboxIndex], 'New value');
    await user.tab();
    textboxIndex++;
  }
  const actions = store.getActions();
  expect(actions.length).toBeGreaterThanOrEqual(1);
  const actionTypes = actions.map(a => a.type);
  expect(actionTypes).toContain("schemaEditor/setPropertyName");
  expect(actionTypes).toContain("schemaEditor/setTitle");
  expect(actionTypes).toContain("schemaEditor/setDescription");
});

test('renders no item if nothing is selected', () => {
  renderSchemaInspector();
  const textboxes = screen.queryAllByRole('textbox');
  expect(textboxes).toHaveLength(0);
});

test('dispatches correctly when changing restriction value', async () => {
  const { store } = renderSchemaInspector(
    getMockSchemaByPath('#/definitions/Kommentar2000Restriksjon'),
  );

  const textboxes = screen.getAllByRole('textbox');
  textboxes.forEach((textbox) => {
    if (textbox.id.includes('minLength-value')) {
      fireEvent.change(textbox, { target: { value: '100' } });
      fireEvent.blur(textbox);
    }
    if (textbox.id.includes('maxLength-value')) {
      fireEvent.change(textbox, { target: { value: '666' } });
      fireEvent.blur(textbox);
    }
  });
  const actions = store.getActions();
  expect(actions).toHaveLength(2);
  actions.forEach((action) => {
    expect(action.type).toContain('schemaEditor');
    expect(['minLength', 'maxLength']).toContain(action.payload.key);
    expect([100, 666]).toContain(action.payload.value);
  });
});

test('Adds new object field when pressing the enter key', async () => {
  const { store, user } = renderSchemaInspector({
    type: FieldType.Object,
    path: '#/properties/test',
    displayName: 'test',
    properties: [
      {
        path: '#/properties/test/properties/abc',
        displayName: 'abc',
      },
    ],
  });
  await user.click(screen.queryAllByRole('tab')[1]);
  await user.click(screen.getByDisplayValue('abc'));
  await user.keyboard('{Enter}');
  expect(store.getActions().map((a) => a.type)).toContain(
    'schemaEditor/addProperty',
  );
});

test('Adds new valid value field when pressing the enter key', async () => {
  const { store, user } = renderSchemaInspector({
    type: FieldType.String,
    path: '#/properties/test',
    displayName: 'test',
    enum: ['valid value'],
  });
  await user.click(screen.queryAllByRole('tab')[1]);
  await user.click(screen.getByDisplayValue('valid value'));
  await user.keyboard('{Enter}');
  expect(store.getActions().map((a) => a.type)).toContain(
    'schemaEditor/addEnum',
  );
});
