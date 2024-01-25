import React from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaEditor } from './SchemaEditor';
import {
  FieldType,
  Keyword,
  buildUiSchema,
  makePointerFromArray,
  SchemaModel,
} from '@altinn/schema-model';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { RenderWithProvidersData } from '../../../test/renderWithProviders';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { getSavedModel } from '../../../test/test-utils';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import * as testids from '../../../../../testing/testids';
import { uiSchemaNodesMock } from '../../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

// Mocks:
const save = jest.fn();

const renderEditor = (data: Partial<RenderWithProvidersData> = {}) => {
  return renderWithProviders({
    appContextProps: {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock).deepClone(),
      save,
      ...data.appContextProps,
    },
  })(<SchemaEditor />);
};

const clickMenuItem = async (name: string) => {
  const item = screen.getByRole('menuitem', { name });
  await act(() => user.click(item));
};

const addNodeButtonTitle = textMock('schema_editor.add_node_of_type');

const clickOpenAddNodeButton = async () => {
  const buttons = screen.getAllByRole('button', { name: addNodeButtonTitle });
  await act(() => user.click(buttons[0]));
};

const clickOpenAddNodeButtonInTree = async () => {
  const tree = screen.getByRole('tree');
  const buttons = within(tree).getAllByRole('button', { name: addNodeButtonTitle });
  await act(() => user.click(buttons[0]));
};

describe('SchemaEditor', () => {
  afterEach(jest.clearAllMocks);

  test('should show context menu and trigger correct dispatch when adding a field on root', async () => {
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButton();
    await clickMenuItem(textMock('schema_editor.string'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchemaNodesMock.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding field on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { [Keyword.Type]: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = buildUiSchema(jsonSchema);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButtonInTree();
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
    await clickOpenAddNodeButtonInTree();
    await clickMenuItem(textMock('schema_editor.add_reference'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('should trigger correct dispatch when deleting a specific node', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const numberOfRootNodes = schemaModel.getRootChildren().length;
    renderEditor({ appContextProps: { schemaModel } });
    const tree = screen.getByRole('tree');
    const deleteButtons = within(tree).getAllByRole('button', {
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
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    renderEditor({ appContextProps: { schemaModel } });
    const tree = screen.getByRole('tree');
    const deleteButtons = within(tree).getAllByRole('button', {
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
    const tree = screen.getByRole('tree');
    const buttonName = textMock('schema_editor.add_node_of_type');
    const addButton = within(tree).queryByRole('button', { name: buttonName });
    expect(addButton).not.toBeInTheDocument();
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
    const tree = screen.getByRole('tree');
    const buttonName = textMock('schema_editor.add_node_of_type');
    const addButton = within(tree).queryByRole('button', { name: buttonName });
    expect(addButton).not.toBeInTheDocument();
  });

  test('should show menu with options string, integer, number, boolean and combination when pressing add', async () => {
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);

    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButton();
    ['string', 'integer', 'number', 'boolean', 'combination'].forEach((type) => {
      const name = textMock(`schema_editor.${type}`);
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    });
  });

  test('should trigger correct dispatch when adding combination to root', async () => {
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButton();
    await clickMenuItem(textMock('schema_editor.combination'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchemaNodesMock.length + 1);
  });

  test('should show context menu and trigger correct dispatch when adding a combination on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { type: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = buildUiSchema(jsonSchema);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButtonInTree();
    await clickMenuItem(textMock('schema_editor.add_combination'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchema.length + 1);
  });

  test('when a type is selected, the type edit panel should be rendered', async () => {
    const name = 'TestType';
    const selectedTypePointer = `#/${Keyword.Definitions}/${name}`;
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
    expect(screen.getByRole('heading', { name, level: 1 })).toBeInTheDocument();
  });

  it('Navigates back to the datamodel when clicking the "back to datamodel" link', async () => {
    const name = 'TestType';
    const selectedTypePointer = `#/${Keyword.Definitions}/${name}`;
    const setSelectedTypePointer = jest.fn();
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
    const dataModelName = 'TestDatamodelName';
    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        name: dataModelName,
      },
    });
    const backButton = screen.getByRole('button', {
      name: textMock('schema_editor.back_to_datamodel'),
    });
    await act(() => user.click(backButton));
    expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedTypePointer).toHaveBeenCalledWith(undefined);
  });
});
