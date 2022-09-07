import React from 'react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { buildUISchema } from '../utils/schema';
import { dataMock } from '../mockData';
import { render, screen } from '@testing-library/react';
import { CombinationKind, FieldType, ISchemaState } from '../types';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event/dist/types/setup/setup';
import { SchemaEditor } from './SchemaEditor';

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
const renderEditor = (customState?: Partial<ISchemaState>) => {
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
  const store = configureStore()({
    ...mockInitialState,
    ...customStateCopy,
  });
  const onSaveSchema = jest.fn();
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <SchemaEditor
        Toolbar={<div>toolbar goes here</div>}
        schema={dataMock}
        language={mockLanguage}
        onSaveSchema={onSaveSchema}
        name='test'
      />
    </Provider>,
  );

  return { store, user };
};

const clickOpenAddMenuButton = (user: UserEvent) =>
  user.click(
    screen.getByRole('button', {
      name: mockLanguage.schema_editor.add,
    }),
  );
const clickAddMenuItem = (user: UserEvent, name: string) =>
  user.click(screen.getByRole('menuitem', { name }));

const clickOpenContextMenuButton = (user: UserEvent) =>
  user.click(screen.getByTestId('open-context-menu-button'));

test('renders schema editor with populated schema', () => {
  renderEditor();
  const editor = screen.getByTestId('schema-editor');
  expect(editor).toBeDefined();
  const saveButton = screen.getByRole('button', {
    name: 'save_data_model',
  });
  expect(saveButton).toBeDefined();
});

test('should show context menu and trigger correct dispatch when adding a field on root', async () => {
  const { store, user } = renderEditor();
  await clickOpenAddMenuButton(user);
  await clickAddMenuItem(user, mockLanguage.schema_editor.field);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload).toEqual({
    name: 'name',
    location: 'properties',
    props: {
      type: FieldType.Object,
    },
  });
});
test('should show context menu and trigger correct dispatch when adding a reference on root', async () => {
  const { store, user } = renderEditor();
  await clickOpenAddMenuButton(user);
  await clickAddMenuItem(user, mockLanguage.schema_editor.reference);

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
  const { store, user } = renderEditor({
    schema: {
      properties: { mockItem: { type: FieldType.Object } },
      definitions: {},
    },
    uiSchema: buildUISchema(
      { mockItem: { type: FieldType.Object } },
      '#/properties',
    ),
  });
  await clickOpenContextMenuButton(user);
  await clickAddMenuItem(user, 'add_field');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/mockItem',
    props: {
      type: FieldType.Object,
    },
  });
});

test('should show context menu and trigger correct dispatch when adding reference on a specific node', async () => {
  const { store, user } = renderEditor({
    schema: {
      properties: { mockItem: { type: FieldType.Object } },
      definitions: {},
    },
    uiSchema: buildUISchema(
      { mockItem: { type: FieldType.Object } },
      '#/properties',
    ),
  });
  await clickOpenContextMenuButton(user);
  await clickAddMenuItem(user, 'Legg til referanse');
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
  const { store, user } = renderEditor();
  await clickOpenContextMenuButton(user);
  await clickAddMenuItem(user, 'Slett');
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
    mockDefinition: { type: FieldType.Object },
  };
  const { user } = renderEditor({
    schema: { properties, definitions },
    uiSchema: buildUISchema(properties, '#/properties').concat(
      buildUISchema(definitions, '#/definitions'),
    ),
  });
  await clickOpenContextMenuButton(user);
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
    mockDefinition: { type: FieldType.Object },
  };
  const { user } = renderEditor({
    schema: { properties, definitions },
    uiSchema: buildUISchema(properties, '#/properties').concat(
      buildUISchema(definitions, '#/definitions'),
    ),
  });
  await clickOpenContextMenuButton(user);
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
    mockDefinition: { type: FieldType.Integer },
  };
  const { user } = renderEditor({
    schema: { properties, definitions },
    uiSchema: buildUISchema(properties, '#/properties').concat(
      buildUISchema(definitions, '#/definitions'),
    ),
  });
  await clickOpenContextMenuButton(user);
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should show menu with option field, reference, and combination when pressing add', async () => {
  const { user } = renderEditor();
  await clickOpenAddMenuButton(user);
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
  const { store, user } = renderEditor();
  await clickOpenAddMenuButton(user);
  await clickAddMenuItem(user, 'combination');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload).toEqual({
    name: 'name',
    location: 'properties',
    props: {
      combination: [],
      combinationKind: CombinationKind.AllOf,
    },
  });
});

test('should show context menu and trigger correct dispatch when adding a combination on a specific node', async () => {
  const { store, user } = renderEditor({
    schema: {
      properties: { mockItem: { type: FieldType.Object } },
      definitions: {},
    },
    uiSchema: buildUISchema(
      { mockItem: { type: FieldType.Object } },
      '#/properties',
    ),
  });
  await clickOpenContextMenuButton(user);
  await clickAddMenuItem(user, 'add_combination');
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/mockItem',
    props: {
      combination: [],
      combinationKind: CombinationKind.AllOf,
    },
  });
});

test('should only be possible to add a reference to a combination type', async () => {
  const { user } = renderEditor({
    schema: {
      properties: { mockItem: { type: FieldType.Object } },
      definitions: {},
    },
    uiSchema: buildUISchema(
      { mockItem: { allOf: [], name: 'allOfTest' } },
      '#/properties',
    ),
  });
  await clickOpenContextMenuButton(user);
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).toContain('add-reference-to-node-button');
  expect(menuItemIds).not.toContain('add-combination-to-node-button');
});
