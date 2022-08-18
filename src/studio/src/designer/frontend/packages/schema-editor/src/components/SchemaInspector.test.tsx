import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import SchemaInspector from './SchemaInspector';
import { dataMock } from '../mockData';
import { buildUISchema, resetUniqueNumber } from '../utils/schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { ISchemaState } from '../types';
import userEvent from '@testing-library/user-event';

const renderSchemaInspector = (customState?: Partial<ISchemaState>) => {
  resetUniqueNumber();
  const mockUiSchema = buildUISchema(dataMock.definitions, '#/definitions');
  const mockInitialState: ISchemaState = {
    name: 'test',
    saveSchemaUrl: '',
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedDefinitionNodeId: '#/definitions/Kommentar2000Restriksjon',
    selectedPropertyNodeId: '#/definitions/Kommentar2000Restriksjon',
    selectedEditorTab: 'properties',
  };
  const customStateCopy = customState ?? {};
  const store = configureStore()({
    ...mockInitialState,
    ...customStateCopy,
  });
  const user = userEvent.setup();
  act(() => {
    render(
      <Provider store={store}>
        <SchemaInspector language={{}} />
      </Provider>,
    );
  });
  return { store, user };
};

test('dispatches correctly when entering text in textboxes', async () => {
  const { store, user } = renderSchemaInspector();
  expect(screen.getByTestId('schema-inspector')).toBeDefined();
  const tablist = screen.getByRole('tablist');
  expect(tablist).toBeDefined();
  const tabpanel = screen.getByRole('tabpanel');
  expect(tabpanel).toBeDefined();
  expect(screen.getAllByRole('tab')).toHaveLength(2);
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
  expect(actions).toHaveLength(textboxes.length);
  actions.forEach((action) => {
    expect(action.type).toContain('schemaEditor');
    expect(Object.values(action.payload)).toContain('New value');
  });
});

test('renders no item if nothing is selected', () => {
  renderSchemaInspector({
    selectedDefinitionNodeId: undefined,
    selectedPropertyNodeId: undefined,
  });
  const textboxes = screen.queryAllByRole('textbox');
  expect(textboxes).toHaveLength(0);
});

test('dispatches correctly when changing restriction value', async () => {
  const { store, user } = renderSchemaInspector();
  await user.click(screen.getByRole('tab', { name: 'restrictions' }));

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
