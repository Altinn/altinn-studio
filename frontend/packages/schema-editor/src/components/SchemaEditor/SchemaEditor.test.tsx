import React from 'react';
import { dataMock } from '../../mockData';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaEditor } from './SchemaEditor';
import {
  FieldType,
  Keyword,
  buildUiSchema,
  UiSchemaNodes,
  makePointerFromArray,
  SchemaModel,
} from '@altinn/schema-model';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders, RenderWithProvidersData } from '../../../test/renderWithProviders';
import { getSavedModel } from '../../../test/test-utils';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import * as testids from '../../../../../testing/testids';
import { uiSchemaNodesMock } from '../../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

// Mocks:
const save = jest.fn();

const renderEditor = (data: Partial<RenderWithProvidersData> = {}) => {
  return renderWithProviders({
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

const clickOpenAddNodeButton = async () => {
  const buttons = screen.getAllByRole('button', {
    name: textMock('schema_editor.add_node_of_type'),
  });
  await act(() => user.click(buttons[0]));
};

const selectedTypePointer = `#/${Keyword.Definitions}/TestType`;
const jsonSchemaTypePanel: JsonSchema = {
  [Keyword.Definitions]: {
    TestType: {
      [Keyword.Type]: FieldType.Object,
      [Keyword.Properties]: {
        prop1: { [Keyword.Type]: FieldType.String },
      },
    },
  },
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
    await clickOpenAddNodeButton();
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
    await clickOpenAddNodeButton();
    await clickMenuItem(textMock('schema_editor.add_reference'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should trigger correct dispatch when deleting a specific node', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
    const numberOfRootNodes = schemaModel.getRootChildren().length;
    renderEditor({ appContextProps: { schemaModel } });
    const deleteButtons = screen.getAllByRole('button', {
      name: textMock('general.delete'),
    });
    const firstDeleteButton = deleteButtons[0];
    await act(() => user.click(firstDeleteButton));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    const updatedNumberOfRootNodes = updatedModel.getRootChildren().length;
    expect(updatedNumberOfRootNodes).toBe(numberOfRootNodes - 1);
  });

  test('should close the dialog and not delete the node when the user just cancels deletion dialog', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
    renderEditor({ appContextProps: { schemaModel } });
    const deleteButtons = screen.getAllByRole('button', {
      name: textMock('general.delete'),
    });
    const firstDeleteButton = deleteButtons[0];
    await act(() => user.click(firstDeleteButton));
    expect(save).not.toHaveBeenCalled();
  });

  test('should not show add node buttons on a reference node', async () => {
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
    const buttonName = textMock('schema_editor.add_node_of_type');
    const addButton = screen.queryByRole('button', { name: buttonName });
    expect(addButton).not.toBeInTheDocument();
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

  test('should not show add node buttons on a field that is not an object', async () => {
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
    const buttonName = textMock('schema_editor.add_node_of_type');
    const addButton = screen.queryByRole('button', { name: buttonName });
    expect(addButton).not.toBeInTheDocument();
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
    await clickOpenAddNodeButton();
    await clickMenuItem(textMock('schema_editor.add_combination'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  it('when a type is selected, the type edit panel should be rendered', async () => {
    const setSelectedTypePointerMock = jest.fn();
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
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

  it('close type when clicking on close button', async () => {
    const setSelectedTypePointer = jest.fn();
    const setSelectedNodePointer = jest.fn();
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));

    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        setSelectedNodePointer,
      },
    });
    const type = screen.getByTestId(testids.typeItem(selectedTypePointer));
    await act(() => user.click(type));
    expect(
      screen.getByText(textMock('schema_editor.types_editing', { type: 'TestType' })),
    ).toBeInTheDocument();
    const closeType = screen.getByRole('button', { name: textMock('schema_editor.close_type') });
    await act(() => user.click(closeType));
    expect(setSelectedTypePointer).toHaveBeenCalledWith(null);
    expect(setSelectedNodePointer).toHaveBeenCalledWith(undefined);
  });

  it('should not display the type panel when selectedTypePointer is null and selectedNodePointer are null/undefined', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    renderEditor({
      appContextProps: { schemaModel, selectedTypePointer: null, selectedNodePointer: undefined },
    });
    expect(
      screen.queryByText(textMock('schema_editor.types_editing', { type: 'TestType' })),
    ).toBeNull();
  });

  it('should close the type panel when deleting the selected unused type', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const setSelectedTypePointer = jest.fn();
    const setSelectedNodePointer = jest.fn();
    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        setSelectedNodePointer,
      },
    });

    const type = screen.getByTestId(testids.typeItem(selectedTypePointer));
    await act(() => user.click(type));

    expect(
      screen.getByText(textMock('schema_editor.types_editing', { type: 'TestType' })),
    ).toBeInTheDocument();
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));

    expect(setSelectedTypePointer).toHaveBeenCalledWith(null);
    expect(setSelectedNodePointer).toHaveBeenCalledWith(null);
  });

  it('should not close the type panel when deleting a property of the selected type', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const setSelectedTypePointer = jest.fn();
    const setSelectedNodePointer = jest.fn();
    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        setSelectedNodePointer,
      },
    });

    const type = screen.getByTestId(testids.typeItem(selectedTypePointer));
    await act(() => user.click(type));

    expect(
      screen.getByText(textMock('schema_editor.types_editing', { type: 'TestType' })),
    ).toBeInTheDocument();

    const treeItem = screen.getByRole('treeitem');
    await act(() => user.click(treeItem));
    const prop1 = screen.getByRole('none', {
      name: /prop1/i,
    });
    await act(() => user.click(prop1));

    const deleteButton = within(prop1).getByRole('button', {
      name: textMock('general.delete'),
    });
    await act(() => user.click(deleteButton));

    expect(setSelectedTypePointer).not.toHaveBeenCalledWith(null);
    expect(setSelectedNodePointer).toHaveBeenCalledWith(null);
  });
});
