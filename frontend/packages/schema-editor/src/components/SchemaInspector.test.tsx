import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { SchemaInspector } from './SchemaInspector';
import { dataMock } from '../mockData';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  buildUiSchema,
  createChildNode,
  createNodeBase,
  FieldType,
  getNodeByPointer,
  Keywords,
} from '@altinn/schema-model';

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
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
const mockUiSchema = buildUiSchema(dataMock);
const getMockSchemaByPath = (selectedId: string): UiSchemaNode =>
  getNodeByPointer(mockUiSchema, selectedId);

const language = {
  'schema_editor.maxLength': 'Maksimal lengde',
  'schema_editor.minLength': 'Minimal lengde',
};

const renderSchemaInspector = (uiSchemaMap: UiSchemaNodes, selectedItem?: UiSchemaNode) => {
  const store = configureStore()({
    uiSchema: uiSchemaMap,
  });
  const user = userEvent.setup();

  render(
    <Provider store={store}>
      <SchemaInspector language={language} selectedItem={selectedItem} />
    </Provider>
  );

  return { store, user };
};

test('dispatches correctly when entering text in textboxes', async () => {
  const { store, user } = renderSchemaInspector(
    mockUiSchema,
    getMockSchemaByPath('#/$defs/Kommentar2000Restriksjon')
  );
  const tablist = screen.getByRole('tablist');
  expect(tablist).toBeDefined();
  const tabpanel = screen.getByRole('tabpanel');
  expect(tabpanel).toBeDefined();
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  const textboxes = screen.getAllByRole('textbox');
  await act(async () => {
    for (const textbox of textboxes) {
      await user.clear(textbox);
      await user.type(textbox, 'New value');
      await user.tab();
    }
  });
  const actions = store.getActions();
  expect(actions.length).toBeGreaterThanOrEqual(1);
  const actionTypes = actions.map((a) => a.type);
  expect(actionTypes).toContain('schemaEditor/setPropertyName');
  expect(actionTypes).toContain('schemaEditor/setTitle');
  expect(actionTypes).toContain('schemaEditor/setDescription');
});

test('renders no item if nothing is selected', () => {
  renderSchemaInspector(mockUiSchema);
  const textboxes = screen.queryAllByRole('textbox');
  expect(textboxes).toHaveLength(0);
});

test('dispatches correctly when changing restriction value', async () => {
  const { store } = renderSchemaInspector(
    mockUiSchema,
    getMockSchemaByPath('#/$defs/Kommentar2000Restriksjon')
  );

  const minLength = '100';
  const maxLength = '666';

  const minLengthTextField = await screen.findByLabelText(language['schema_editor.minLength']);
  fireEvent.change(minLengthTextField, { target: { value: minLength } });
  fireEvent.blur(minLengthTextField);

  const maxLengthTextField = await screen.findByLabelText(language['schema_editor.maxLength']);
  fireEvent.change(maxLengthTextField, { target: { value: maxLength } });
  fireEvent.blur(maxLengthTextField);

  const actions = store.getActions();
  expect(actions).toHaveLength(2);

  expect(actions[0].type).toContain('schemaEditor');
  expect(actions[0].payload.restrictions).toEqual(expect.objectContaining({ minLength }));
  expect(actions[1].type).toContain('schemaEditor');
  expect(actions[1].payload.restrictions).toEqual(expect.objectContaining({ maxLength }));
});

test('Adds new object field when pressing the enter key', async () => {
  const testUiSchema = buildUiSchema({});
  const parentNode = createNodeBase(Keywords.Properties, 'test');
  parentNode.fieldType = FieldType.Object;
  parentNode.children = ['#/properties/test/properties/abc'];
  testUiSchema.push(parentNode);
  const childNode = createChildNode(parentNode, 'abc', false);
  testUiSchema.push(childNode);
  const { store, user } = renderSchemaInspector(testUiSchema, parentNode);
  await act(async () => {
    await user.click(screen.queryAllByRole('tab')[1]);
    await user.click(screen.getByDisplayValue('abc'));
    await user.keyboard('{Enter}');
  });
  expect(store.getActions().map((a) => a.type)).toContain('schemaEditor/addProperty');
});

test('Adds new valid value field when pressing the enter key', async () => {
  const testUiSchema = buildUiSchema({});
  const item = createNodeBase(Keywords.Properties, 'test');
  item.fieldType = FieldType.String;
  item.enum = ['valid value'];
  testUiSchema.push(item);
  const { store, user } = renderSchemaInspector(testUiSchema, item);
  await act(async () => {
    await user.click(screen.queryAllByRole('tab')[1]);
    await user.click(screen.getByDisplayValue('valid value'));
    await user.keyboard('{Enter}');
  });
  expect(store.getActions().map((a) => a.type)).toContain('schemaEditor/addEnum');
});
