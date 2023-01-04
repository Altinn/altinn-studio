import React from 'react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { dataMock } from '../mockData';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event/dist/types/setup/setup';
import { SchemaEditor, SchemaEditorTestIds } from './SchemaEditor';
import type { ISchemaState } from '../types';
import {
  buildUiSchema,
  CombinationKind,
  FieldType,
  getNodeByPointer,
  Keywords,
  makePointer,
  ObjectKind,
} from '@altinn/schema-model';
import { SchemaItemLabelTestIds } from '@altinn/schema-editor/components/TreeView/SchemaItemLabel';

const mockLanguage = {
  'schema_editor.add': 'Legg til',
  'schema_editor.add_element': 'Add Element',
  'schema_editor.add_property': 'Legg til felt',
  'schema_editor.add_reference': 'Legg til referanse',
  'schema_editor.delete': 'Slett',
  'schema_editor.field': 'Felt',
  'schema_editor.reference': 'Referanse',
};
const uiSchema = buildUiSchema(dataMock);
const renderEditor = (customState?: Partial<ISchemaState>, editMode?: boolean) => {
  const mockInitialState = {
    name: 'test',
    saveSchemaUrl: '',
    schema: dataMock,
    uiSchema: uiSchema,
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
  const toggleEditMode = () => jest.fn();
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <SchemaEditor
        Toolbar={<div>toolbar goes here</div>}
        LandingPagePanel={<div>landing page panel goes here</div>}
        schema={dataMock}
        saveUrl={''}
        language={mockLanguage}
        onSaveSchema={onSaveSchema}
        name='test'
        editMode={editMode === undefined ? true : editMode}
        toggleEditMode={toggleEditMode}
      />
    </Provider>
  );
  return { store, user };
};

const clickMenuItem = (user: UserEvent, testId: string) => user.click(screen.getByTestId(testId));

const clickOpenContextMenuButton = (user: UserEvent) =>
  user.click(screen.getAllByTestId('open-context-menu-button')[0]);

test('renders schema editor with populated schema in view mode', () => {
  renderEditor({}, false);
  expect(screen.getByTestId('schema-editor')).toBeDefined();
  expect(screen.getByTestId('save-model-button')).toBeDefined();
  expect(screen.getByTestId('save-model-button')).toBeDisabled();
  expect(screen.queryByTestId('schema-inspector')).toBeNull();
});

test('renders schema editor with populated schema in edit mode', () => {
  renderEditor();
  expect(screen.getByTestId('schema-editor')).toBeDefined();
  expect(screen.getByTestId('save-model-button')).toBeDefined();
  expect(screen.getByTestId('save-model-button')).toBeEnabled();
  expect(screen.queryByTestId('schema-inspector')).toBeDefined();
});

test('should show context menu and trigger correct dispatch when adding a field on root', async () => {
  const { store, user } = renderEditor();
  await clickMenuItem(user, SchemaEditorTestIds.menuAddField);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload.name).toBe('name');
  expect(lastAction.payload.location).toBe('#/properties');
  expect(lastAction.payload.props.fieldType).toBe(FieldType.Object);
  expect(lastAction.payload.props.objectKind).toBe(ObjectKind.Field);
});

test('should show context menu and trigger correct dispatch when adding a reference on root', async () => {
  const { store, user } = renderEditor();
  await clickMenuItem(user, SchemaEditorTestIds.menuAddReference);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload.name).toBe('name');
  expect(lastAction.payload.location).toBe('#/properties');
  expect(lastAction.payload.props.objectKind).toBe(ObjectKind.Reference);
  expect(lastAction.payload.props.ref).toBe('');
});

test('should show context menu and trigger correct dispatch when adding field on a specific node', async () => {
  const jsonSchema = {
    [Keywords.Properties]: { mockItem: { [Keywords.Type]: FieldType.Object } },
    [Keywords.Definitions]: {},
  };
  const { store, user } = renderEditor({
    schema: jsonSchema,
    uiSchema: buildUiSchema(jsonSchema),
  });
  await clickOpenContextMenuButton(user);
  await clickMenuItem(user, SchemaItemLabelTestIds.contextMenuAddField);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload.pointer).toBe('#/properties/mockItem');
  expect(lastAction.payload.props.objectKind).toBe(ObjectKind.Field);
  expect(lastAction.payload.props.fieldType).toBe(FieldType.String);
});

test('should show context menu and trigger correct dispatch when adding reference on a specific node', async () => {
  const jsonSchema = {
    [Keywords.Properties]: { mockItem: { [Keywords.Type]: FieldType.Object } },
    [Keywords.Definitions]: {},
  };
  const { store, user } = renderEditor({
    schema: jsonSchema,
    uiSchema: buildUiSchema(jsonSchema),
  });
  await clickOpenContextMenuButton(user);
  await clickMenuItem(user, SchemaItemLabelTestIds.contextMenuAddReference);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload.pointer).toBe('#/properties/mockItem');
  expect(lastAction.payload.props.objectKind).toBe(ObjectKind.Reference);
  expect(lastAction.payload.props.ref).toBe('');
});

test('should show context menu and trigger correct dispatch when deleting a specific node', async () => {
  const { store, user } = renderEditor();
  await clickOpenContextMenuButton(user);
  await clickMenuItem(user, SchemaItemLabelTestIds.contextMenuDelete);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/deleteProperty');
  expect(lastAction.payload).toEqual({
    path: '#/properties/melding',
  });
});

test('should not show add property or add reference buttons on a reference node', async () => {
  const jsonSchema = {
    [Keywords.Properties]: {
      mockItem: {
        [Keywords.Reference]: makePointer(Keywords.Definitions, 'mockDefinition'),
      },
    },
    [Keywords.Definitions]: {
      mockDefinition: { [Keywords.Type]: FieldType.Object },
    },
  };
  const { user } = renderEditor({
    schema: jsonSchema,
    uiSchema: buildUiSchema(jsonSchema),
  });
  await clickOpenContextMenuButton(user);
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should not show add property or add reference buttons on a reference node that has not yet set reference', async () => {
  const jsonSchema = {
    [Keywords.Properties]: {
      mockItem: { [Keywords.Reference]: undefined },
    },
    [Keywords.Definitions]: {
      mockDefinition: { [Keywords.Type]: FieldType.Object },
    },
  };
  const uiSchema = buildUiSchema(jsonSchema);

  /**
   * Important, the new model engine doesn't allow references to be unknown. While the old would use an empty string.
   * This logic need to be implemented.
   */
  const mockItem = getNodeByPointer(uiSchema, '#/properties/mockItem');
  mockItem.ref = '';
  mockItem.objectKind = ObjectKind.Reference;

  const { user } = renderEditor({
    schema: jsonSchema,
    uiSchema,
  });
  await clickOpenContextMenuButton(user);
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should not show add property or add reference buttons on a field that is not type object', async () => {
  const jsonSchema = {
    [Keywords.Properties]: {
      mockItem: {
        [Keywords.Reference]: makePointer(Keywords.Definitions, 'mockDefinition'),
      },
    },
    [Keywords.Definitions]: {
      mockDefinition: { [Keywords.Type]: FieldType.Integer },
    },
  };
  const { user } = renderEditor({
    schema: jsonSchema,
    uiSchema: buildUiSchema(jsonSchema),
  });
  await clickOpenContextMenuButton(user);
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).not.toContain('add-reference-to-node-button');
});

test('should show menu with option field, reference, and combination when pressing add', async () => {
  renderEditor();
  expect(screen.getAllByTestId(SchemaEditorTestIds.menuAddField)).toHaveLength(1);
  expect(screen.getAllByTestId(SchemaEditorTestIds.menuAddReference)).toHaveLength(1);
  expect(screen.getAllByTestId(SchemaEditorTestIds.menuAddCombination)).toHaveLength(1);
});

test('should trigger correct dispatch when adding combination to root', async () => {
  const { store, user } = renderEditor();
  await clickMenuItem(user, SchemaEditorTestIds.menuAddCombination);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addRootItem');
  expect(lastAction.payload.location).toBe('#/properties');
  expect(lastAction.payload.props.objectKind).toBe(ObjectKind.Combination);
  expect(lastAction.payload.props.fieldType).toBe(CombinationKind.AllOf);
});

test('should show context menu and trigger correct dispatch when adding a combination on a specific node', async () => {
  const jsonSchema = {
    [Keywords.Properties]: { mockItem: { type: FieldType.Object } },
    [Keywords.Definitions]: {},
  };
  const { store, user } = renderEditor({
    schema: jsonSchema,
    uiSchema: buildUiSchema(jsonSchema),
  });
  await clickOpenContextMenuButton(user);
  await clickMenuItem(user, SchemaItemLabelTestIds.contextMenuAddCombination);
  const actions = store.getActions();
  const lastAction = actions.at(-1);
  expect(lastAction.type).toBe('schemaEditor/addProperty');
  expect(lastAction.payload).toEqual({
    pointer: '#/properties/mockItem',
    props: {
      objectKind: ObjectKind.Combination,
      fieldType: CombinationKind.AllOf,
      ref: undefined,
    },
  });
});

test('should only be possible to add a reference to a combination type', async () => {
  const jsonSchema = {
    [Keywords.Properties]: {
      mockItem: {
        [CombinationKind.AllOf]: [{ [Keywords.Type]: FieldType.String }],
      },
    },
    [Keywords.Definitions]: {},
  };
  const uiSchema = buildUiSchema(jsonSchema);
  const { user } = renderEditor({
    schema: jsonSchema,
    uiSchema,
  });
  await clickOpenContextMenuButton(user);
  const menuitems = screen.getAllByRole('menuitem');
  const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
  expect(menuItemIds).not.toContain('add-field-to-node-button');
  expect(menuItemIds).toContain('add-reference-to-node-button');
  expect(menuItemIds).not.toContain('add-combination-to-node-button');
});

test('should trigger correct dispatch when changing tab', async () => {
  const { store, user } = renderEditor();
  const tab = screen.getByRole('tab', { name: 'types' });
  await user.click(tab);
  const lastAction = store.getActions().at(-1);
  expect(lastAction.type).toBe('schemaEditor/setSelectedTab');
  expect(lastAction.payload).toStrictEqual({ selectedTab: 'definitions' });
});
