import React from 'react';
import { dataMock } from '../mockData';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaEditor } from './SchemaEditor';
import type { SchemaState } from '../types';
import {
  CombinationKind,
  FieldType,
  Keyword,
  buildUiSchema,
  UiSchemaNodes,
  makePointerFromArray,
  SchemaModel,
} from '@altinn/schema-model';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders, RenderWithProvidersData } from '../../test/renderWithProviders';
import { getSavedModel } from '../../test/test-utils';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import * as testids from '../../../../testing/testids';
import { uiSchemaNodesMock } from '../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

// Mocks:
const save = jest.fn();

const renderEditor = (data: Partial<RenderWithProvidersData> = {}) => {
  const mockInitialState: SchemaState = {
    name: 'test',
    selectedDefinitionNodeId: '',
    selectedPropertyNodeId: '',
    selectedEditorTab: 'properties',
  };
  return renderWithProviders({
    state: {
      ...mockInitialState,
      ...data.state,
    },
    appContextProps: {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
      save,
      ...data.appContextProps,
    },
  })(<SchemaEditor />);
};

const clickMenuItem = async (name: string) => {
  const item = screen.getByRole('menuitem', { name });
  await act(() => user.click(item));
};

const clickOpenContextMenuButton = async () => {
  const buttons = screen.getAllByRole('button', {
    name: textMock('schema_editor.open_action_menu'),
  });
  await act(() => user.click(buttons[0]));
};

describe('SchemaEditor', () => {
  afterEach(jest.clearAllMocks);

  test('should show context menu and trigger correct dispatch when adding a field on root', async () => {
    const uiSchema: UiSchemaNodes = buildUiSchema(dataMock);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickMenuItem(textMock('schema_editor.field'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding a reference on root', async () => {
    const uiSchema = buildUiSchema(dataMock);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    jest.spyOn(window, 'prompt').mockImplementation(() => 'Tekst');
    await clickMenuItem(textMock('schema_editor.reference'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding field on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { [Keyword.Type]: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = buildUiSchema(jsonSchema);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.add_field'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding reference on a specific node', async () => {
    const definitionName = 'definition';
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { [Keyword.Type]: FieldType.Object } },
      [Keyword.Definitions]: { [definitionName]: { [Keyword.Type]: FieldType.String } },
    };
    const uiSchema = buildUiSchema(jsonSchema);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    jest.spyOn(window, 'prompt').mockImplementation(() => definitionName);
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.add_reference'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and show deletion dialog', async () => {
    renderEditor();
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.delete'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  test('should trigger correct dispatch when deleting a specific node', async () => {
    const uiSchema = buildUiSchema(dataMock);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.delete'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const confirmDeletButton = screen.getByRole('button', {
      name: textMock('schema_editor.datamodel_field_deletion_confirm'),
    });
    await act(() => user.click(confirmDeletButton));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length - 1);
  });

  test('should close the dialog and not delete the node when the user just cancels deletion dialog', async () => {
    renderEditor();
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.delete'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await act(() => user.click(cancelButton));
    expect(save).not.toHaveBeenCalled();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  test('should not show add property or add reference buttons on a reference node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        mockItem: {
          [Keyword.Reference]: makePointerFromArray([Keyword.Definitions, 'mockDefinition']),
        },
      },
      [Keyword.Definitions]: {
        mockDefinition: { [Keyword.Type]: FieldType.Object },
      },
    };
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchema));
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).not.toContain('add-reference-to-node-button');
  });

  it('Should not add a reference when an invalid reference name is given', async () => {
    const uiSchema = buildUiSchema(dataMock);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    jest.spyOn(window, 'prompt').mockImplementation(() => 'Noe som ikke finnes');
    jest.spyOn(window, 'alert').mockImplementation(jest.fn());
    await clickMenuItem(textMock('schema_editor.reference'));
    expect(save).not.toHaveBeenCalled();
  });

  it('Should not add a reference when the prompt is cancelled', async () => {
    const uiSchema = buildUiSchema(dataMock);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    jest.spyOn(window, 'prompt').mockImplementation(() => null);
    await clickMenuItem(textMock('schema_editor.reference'));
    expect(save).not.toHaveBeenCalled();
  });

  test('should not show add property or add reference buttons on a field that is not type object', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        mockItem: {
          [Keyword.Reference]: makePointerFromArray([Keyword.Definitions, 'mockDefinition']),
        },
      },
      [Keyword.Definitions]: {
        mockDefinition: { [Keyword.Type]: FieldType.Integer },
      },
    };
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchema));
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).not.toContain('add-reference-to-node-button');
  });

  test('should show menu with option field, reference, and combination when pressing add', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(dataMock));

    renderEditor({ appContextProps: { schemaModel } });
    expect(
      screen.getByRole('menuitem', { name: textMock('schema_editor.field') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('schema_editor.reference') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('schema_editor.combination') }),
    ).toBeInTheDocument();
  });

  test('should trigger correct dispatch when adding combination to root', async () => {
    const uiSchema = buildUiSchema(dataMock);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickMenuItem(textMock('schema_editor.combination'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding a combination on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { type: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = buildUiSchema(jsonSchema);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenContextMenuButton();
    await clickMenuItem(textMock('schema_editor.add_combination'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
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
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchema));
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenContextMenuButton();
    const menuitems = screen.getAllByRole('menuitem');
    const menuItemIds: string[] = menuitems.map((menuitem) => menuitem.id);
    expect(menuItemIds).not.toContain('add-field-to-node-button');
    expect(menuItemIds).toContain('add-reference-to-node-button');
    expect(menuItemIds).not.toContain('add-combination-to-node-button');
  });

  test('when a type is selected, the type edit panel should be rendered', async () => {
    const selectedTypePointer = `#/${Keyword.Definitions}/TestType`;
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        someProp: { [Keyword.Type]: FieldType.String },
        testProp: { [Keyword.Reference]: selectedTypePointer },
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
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchema));
    const setSelectedTypePointerMock = jest.fn();
    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer: setSelectedTypePointerMock,
      },
    });
    const type = screen.getByTestId(testids.typeItem(selectedTypePointer));
    await act(() => user.click(type));
    expect(
      screen.getByText(textMock('schema_editor.types_editing', { type: 'TestType' })),
    ).toBeDefined();
  });

  test('close type when clicking on close button', async () => {
    const selectedTypePointer = `#/${Keyword.Definitions}/TestType`;
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {
        someProp: { [Keyword.Type]: FieldType.String },
        testProp: { [Keyword.Reference]: selectedTypePointer },
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
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchema));
    renderEditor({
      appContextProps: { schemaModel, selectedTypePointer, setSelectedTypePointer: jest.fn() },
    });
    const type = screen.getByTestId(testids.typeItem(selectedTypePointer));
    await act(() => user.click(type));
    const closeType = screen.getByRole('button', { name: textMock('schema_editor.close_type') });
    await act(() => user.click(closeType));
    expect(screen.queryByText(textMock('schema_editor.types_editing'))).toBeNull();
  });
});
