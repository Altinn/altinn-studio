import React from 'react';
import { dataMock } from '../mockData';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaEditor } from './SchemaEditor';
import type { SchemaState } from '../types';
import {
  CombinationKind,
  FieldType,
  Keyword,
  ObjectKind,
  UiSchemaNodes,
  buildUiSchema,
  getNodeByPointer,
  makePointer,
} from '@altinn/schema-model';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/renderWithProviders';
import { queryClientMock } from '../../test/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getSavedModel } from '../../test/test-utils';
import { JsonSchema } from 'app-shared/types/JsonSchema';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const modelPath = 'modelPath';

// Mocks:
const saveDatamodel = jest.fn();

const renderEditor = (customState?: Partial<SchemaState>, editMode?: boolean) => {
  const mockInitialState: SchemaState = {
    name: 'test',
    selectedDefinitionNodeId: '',
    selectedPropertyNodeId: '',
    selectedEditorTab: 'properties',
  };
  const customStateCopy = customState ?? {};
  const state: SchemaState = {
    ...mockInitialState,
    ...customStateCopy,
  };
  const toggleEditMode = () => jest.fn();

  return renderWithProviders({
    state,
    appContextProps: { modelPath },
    servicesContextProps: { saveDatamodel }
  })(
    <SchemaEditor
      LandingPagePanel={<div>landing page panel goes here</div>}
      name='test'
      editMode={editMode === undefined ? true : editMode}
      onSaveSchema={jest.fn()}
      schemaState={{ saving: false, error: null }}
      toggleEditMode={toggleEditMode}
      toolbarProps={{
        createNewOpen: false,
        createPathOption: false,
        handleCreateSchema: jest.fn(),
        handleDeleteSchema: jest.fn(),
        handleXsdUploaded: jest.fn(),
        metadataOptions: [],
        modelNames: [],
        selectedOption: { value: { fileName: '', fileType: '.json', repositoryRelativeUrl: '' }, label: '' },
        setCreateNewOpen: jest.fn(),
        setSelectedOption: jest.fn(),
      }}
    />
  );
};

const clickMenuItem = async (name: string) =>{
  const item = screen.getByRole('menuitem', { name });
  await act(() => user.click(item));
};

const clickOpenContextMenuButton = async () => {
  const buttons = screen.getAllByRole('button', { name: textMock('schema_editor.open_action_menu') });
  await act(() => user.click(buttons[0]));
};

const setSchema = (schema: JsonSchema): UiSchemaNodes => {
  const uiSchema = buildUiSchema(schema);
  queryClientMock.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchema);
  return uiSchema;
};

describe('SchemaEditor', () => {
  afterEach(jest.clearAllMocks);

  test('renders schema editor with populated schema in view mode', () => {
    setSchema(dataMock);
    renderEditor({}, false);
    expect(screen.getByTestId('schema-editor')).toBeDefined();
    const saveButton = screen.getByRole('button', { name: textMock('schema_editor.generate_model_files') });
    expect(saveButton).toBeDefined();
    expect(saveButton).toBeDisabled();
    expect(screen.queryByTestId('schema-inspector')).toBeNull();
    expect(screen.getByTestId('types-inspector')).toBeDefined();
  });

  test('renders schema editor with populated schema in edit mode', () => {
    setSchema(dataMock);
    renderEditor({}, true);
    expect(screen.getByTestId('schema-editor')).toBeDefined();
    const saveButton = screen.getByRole('button', { name: textMock('schema_editor.generate_model_files') });
    expect(saveButton).toBeDefined();
    expect(saveButton).toBeEnabled();
    expect(screen.queryByTestId('schema-inspector')).toBeDefined(); // eslint-disable-line testing-library/prefer-presence-queries
    expect(screen.getByTestId('types-inspector')).toBeDefined();
  });

  test('should show context menu and trigger correct dispatch when adding a field on root', async () => {
    const uiSchema = setSchema(dataMock);
    renderEditor();
    await clickMenuItem(textMock('schema_editor.field'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding a reference on root', async () => {
    const uiSchema = setSchema(dataMock);
    renderEditor();
    await clickMenuItem(textMock('schema_editor.reference'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding field on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { [Keyword.Type]: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = setSchema(jsonSchema);
    renderEditor();
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.add_field'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding reference on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { [Keyword.Type]: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = setSchema(jsonSchema);
    renderEditor();
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.add_reference'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when deleting a specific node', async () => {
    const uiSchema = setSchema(dataMock);
    renderEditor();
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.delete'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length - 1);
  });

  test('should not show add property or add reference buttons on a reference node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        mockItem: {
          [Keyword.Reference]: makePointer(Keyword.Definitions, 'mockDefinition'),
        },
      },
      [Keyword.Definitions]: {
        mockDefinition: { [Keyword.Type]: FieldType.Object },
      },
    };
    setSchema(jsonSchema);
    renderEditor();
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).not.toContain('add-reference-to-node-button');
  });

  test('should not show add property or add reference buttons on a reference node that has not yet set reference', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        mockItem: { [Keyword.Reference]: undefined },
      },
      [Keyword.Definitions]: {
        mockDefinition: { [Keyword.Type]: FieldType.Object },
      },
    };
    const uiSchemaToTest = setSchema(jsonSchema);

    /**
     * Important, the new model engine doesn't allow references to be unknown. While the old would use an empty string.
     * This logic need to be implemented.
     */
    const mockItem = getNodeByPointer(uiSchemaToTest, '#/properties/mockItem');
    mockItem.reference = '';
    mockItem.objectKind = ObjectKind.Reference;

    renderEditor();
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).not.toContain('add-reference-to-node-button');
  });

  test('should not show add property or add reference buttons on a field that is not type object', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        mockItem: {
          [Keyword.Reference]: makePointer(Keyword.Definitions, 'mockDefinition'),
        },
      },
      [Keyword.Definitions]: {
        mockDefinition: { [Keyword.Type]: FieldType.Integer },
      },
    };
    setSchema(jsonSchema);
    renderEditor();
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).not.toContain('add-reference-to-node-button');
  });

  test('should show menu with option field, reference, and combination when pressing add', async () => {
    setSchema(dataMock);
    renderEditor();
    expect(screen.getByRole('menuitem', { name: textMock('schema_editor.field') })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: textMock('schema_editor.reference') })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: textMock('schema_editor.combination') })).toBeInTheDocument();
  });

  test('should trigger correct dispatch when adding combination to root', async () => {
    const uiSchema = setSchema(dataMock);
    renderEditor();
    await clickMenuItem(textMock('schema_editor.combination'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding a combination on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { type: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = setSchema(jsonSchema);
    renderEditor();
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.add_combination'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    expect(updatedModel.length).toBe(uiSchema.length + 1);
  });

  test('should only be possible to add a reference to a combination type', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        mockItem: {
          [CombinationKind.AllOf]: [{ [Keyword.Type]: FieldType.String }],
        },
      },
      [Keyword.Definitions]: {},
    };
    setSchema(jsonSchema);
    renderEditor();
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).toContain('add-reference-to-node-button');
    expect(menuItemIds).not.toContain('add-combination-to-node-button');
  });

  test('when a type is selected, the type edit panel should be rendered', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        someProp: { [Keyword.Type]: FieldType.String },
        testProp: { [Keyword.Reference]: `#/${Keyword.Definitions}/TestType` },
      },
      [Keyword.Definitions]: {
        TestType: {
          [Keyword.Type]: FieldType.Object,
          [Keyword.Properties]: {
            prop1: { [Keyword.Type]: FieldType.String },
            prop2: { [Keyword.Type]: FieldType.String },
          },
        },
      },
    };
    setSchema(jsonSchema);
    renderEditor();
    const type = screen.getByTestId(`type-item-#/${Keyword.Definitions}/TestType`);
    await act(() => user.click(type));
    expect(screen.getByText(textMock('schema_editor.types_editing'))).toBeDefined();
  });
});
