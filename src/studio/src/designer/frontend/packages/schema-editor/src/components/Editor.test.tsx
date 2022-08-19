import React from 'react';
import SchemaEditor from './Editor';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { act } from 'react-dom/test-utils';
import { buildUISchema } from '../utils/schema';
import { dataMock } from '../mockData';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ISchemaState } from '../types';

const mockLanguage = {
  schema_editor: {
    add: 'Legg til',
    add_element: 'Add Element',
    add_property: 'Legg til felt',
    add_reference: 'Legg til referanse',
    delete: 'Slett',
    field: 'Felt',
    reference: 'Referanse',
  },
};
const renderEditor = async (customState?: Partial<ISchemaState>) => {
  const mockUiSchema = buildUISchema(
    dataMock.properties,
    '#/properties',
  ).concat(buildUISchema(dataMock.definitions, '#/definitions'));

  const mockInitialState = {
    name: 'test',
    saveSchemaUrl: '',
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedDefinitionNodeId: '',
    selectedPropertyNodeId: '',
    selectedEditorTab: 'properties',
  };
  const customStateCopy = customState ?? {};
  const mockStore = configureStore()({
    ...mockInitialState,
    ...customStateCopy,
  });
  const onSaveSchema = jest.fn();

  await render(
    <Provider store={mockStore}>
      <SchemaEditor
        Toolbar={<div>toolbar goes here</div>}
        schema={dataMock}
        language={mockLanguage}
        onSaveSchema={onSaveSchema}
        name='test'
      />
    </Provider>,
  );

  return [mockStore];
};

const clickOpenAddMenuButton = () =>
  fireEvent.click(
    screen.getByRole('button', {
      name: mockLanguage.schema_editor.add,
    }),
  );
const clickAddMenuItem = (name: string) =>
  fireEvent.click(screen.getByRole('menuitem', { name }));

const clickOpenContextMenuButton = () =>
  fireEvent.click(screen.getByTestId('open-context-menu-button'));

test('renders schema editor with populated schema', async () => {
  const [store] = await renderEditor();
  const editor = await screen.getByTestId('schema-editor');
  expect(editor).toBeDefined();
  const saveButton = await screen.getByRole('button', {
    name: 'save_data_model',
  });
  expect(saveButton).toBeDefined();
});

test('should show context menu and trigger correct dispatch when adding a field on root', async () => {
  const [store] = await renderEditor();
  clickOpenAddMenuButton();
  clickAddMenuItem(mockLanguage.schema_editor.field);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload).toEqual({
    name: 'name',
    location: 'properties',
    props: {
      type: 'object',
    },
  });
});
test('should show context menu and trigger correct dispatch when adding a reference on root', async () => {
  const [store] = await renderEditor();
  clickOpenAddMenuButton();
  clickAddMenuItem(mockLanguage.schema_editor.reference);

  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload).toEqual({
    name: 'name',
    location: 'properties',
    props: {
      $ref: '',
    },
  });
});

test('should show context menu and trigger correct dispatch when adding field on a specific node', async () => {
  const [store] = await renderEditor({
    schema: { properties: { mockItem: { type: 'object' } }, definitions: {} },
    uiSchema: buildUISchema({ mockItem: { type: 'object' } }, '#/properties'),
  });
  clickOpenContextMenuButton();
  clickAddMenuItem('add_field');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/mockItem',
    props: {
      type: 'object',
    },
  });
});

test('should show context menu and trigger correct dispatch when adding reference on a specific node', async () => {
  const [store] = await renderEditor({
    schema: { properties: { mockItem: { type: 'object' } }, definitions: {} },
    uiSchema: buildUISchema({ mockItem: { type: 'object' } }, '#/properties'),
  });
  clickOpenContextMenuButton();
  clickAddMenuItem('Legg til referanse');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/mockItem',
    props: {
      $ref: '',
    },
  });
});

test('should show context menu and trigger correct dispatch when deleting a specific node', async () => {
  const [store] = await renderEditor();
  clickOpenContextMenuButton();
  clickAddMenuItem('Slett');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/deleteProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/melding',
  });
});

test('should not show add property or add reference buttons on a reference node', async () => {
  const properties = {
    mockItem: { $ref: '#/definitions/mockDefinition' },
  };
  const definitions = {
    mockDefinition: { type: 'object' },
  };
  await renderEditor({
    schema: { properties, definitions },
    uiSchema: buildUISchema(properties, '#/properties').concat(
      buildUISchema(definitions, '#/definitions'),
    ),
  });
  clickOpenContextMenuButton();
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should not show add property or add reference buttons on a reference node that has not yet set reference', async () => {
  const properties = {
    mockItem: { $ref: '' },
  };
  const definitions = {
    mockDefinition: { type: 'object' },
  };
  await renderEditor({
    schema: { properties, definitions },
    uiSchema: buildUISchema(properties, '#/properties').concat(
      buildUISchema(definitions, '#/definitions'),
    ),
  });
  clickOpenContextMenuButton();
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should not show add property or add reference buttons on a field that is not type object', async () => {
  const properties = {
    mockItem: { $ref: '#/definitions/mockDefinition' },
  };
  const definitions = {
    mockDefinition: { type: 'integer' },
  };
  await renderEditor({
    schema: { properties, definitions },
    uiSchema: buildUISchema(properties, '#/properties').concat(
      buildUISchema(definitions, '#/definitions'),
    ),
  });
  clickOpenContextMenuButton();
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should show menu with option field, reference, and combination when pressing add', async () => {
  await renderEditor();
  clickOpenAddMenuButton();
  expect(
    screen.getAllByRole('menuitem', { name: mockLanguage.schema_editor.field }),
  ).toHaveLength(1);
  expect(
    screen.getAllByRole('menuitem', {
      name: mockLanguage.schema_editor.reference,
    }),
  ).toHaveLength(1);
  expect(screen.getAllByRole('menuitem', { name: 'combination' })).toHaveLength(
    1,
  );
});

test('should trigger correct dispatch when adding combination to root', async () => {
  const [store] = await renderEditor();
  clickOpenAddMenuButton();
  clickAddMenuItem('combination');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload).toEqual({
    name: 'name',
    location: 'properties',
    props: {
      combination: [],
      combinationKind: 'allOf',
    },
  });
});

test('should show context menu and trigger correct dispatch when adding a combination on a specific node', async () => {
  const [store] = await renderEditor({
    schema: { properties: { mockItem: { type: 'object' } }, definitions: {} },
    uiSchema: buildUISchema({ mockItem: { type: 'object' } }, '#/properties'),
  });
  clickOpenContextMenuButton();
  clickAddMenuItem('add_combination');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/mockItem',
    props: {
      combination: [],
      combinationKind: 'allOf',
    },
  });
});

test('should only be possible to add a reference to a combination type', async () => {
  const [store] = await renderEditor({
    schema: { properties: { mockItem: { type: 'object' } }, definitions: {} },
    uiSchema: buildUISchema(
      { mockItem: { allOf: [], name: 'allOfTest' } },
      '#/properties',
    ),
  });
  clickOpenContextMenuButton();
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).toContain('add-reference-to-node-button');
  expect(menuItemIds).not.toContain('add-combination-to-node-button');
});
