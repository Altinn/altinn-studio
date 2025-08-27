import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaEditor } from './SchemaEditor';
import {
  FieldType,
  Keyword,
  buildUiSchema,
  makePointerFromArray,
  SchemaModel,
} from '@altinn/schema-model/index';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { RenderWithProvidersData } from '../../../test/renderWithProviders';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { getSavedModel } from '../../../test/test-utils';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { typeItemId } from '@studio/testing/testids';
import { uiSchemaNodesMock } from '../../../test/mocks/uiSchemaMock';
import { organization } from 'app-shared/mocks/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { MockServicesContextWrapper } from 'dashboard/dashboardTestUtils';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const user = userEvent.setup();

// Mocks:
const save = jest.fn();

const renderEditor = (
  data: Partial<RenderWithProvidersData> = {},
  services?: Partial<ServicesContextProps>,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.Organizations],
    [
      {
        ...organization,
        username: 'ttd',
      },
    ],
  );
  queryClient.setQueryData([QueryKey.CurrentUser], user);

  return renderWithProviders({
    appContextProps: {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock).deepClone(),
      save,
      ...data.appContextProps,
    },
  })(
    <MockServicesContextWrapper customServices={services} client={queryClient}>
      <SchemaEditor />
    </MockServicesContextWrapper>,
  );
};

const clickMenuItem = async (name: string) => {
  const item = screen.getByRole('menuitem', { name });
  await user.click(item);
};

const addNodeOnRootButtonTitle = textMock('schema_editor.add_node_of_type');
const addNodeOnChildButtonTitle = textMock('schema_editor.add_node_of_type_in_child_node_title');

const clickOpenAddNodeButton = async () => {
  const buttons = screen.getAllByRole('button', { name: addNodeOnRootButtonTitle });
  await user.click(buttons[0]);
};

const clickOpenAddNodeButtonInTree = async () => {
  const tree = screen.getByRole('tree');
  const buttons = within(tree).getAllByRole('button', { name: addNodeOnChildButtonTitle });
  await user.click(buttons[0]);
};

const typeName = 'TestType';
const selectedTypePointer = `#/${Keyword.Definitions}/${typeName}`;
const jsonSchemaTypePanel: JsonSchema = {
  [Keyword.Definitions]: {
    [typeName]: {
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
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButton();
    await clickMenuItem(textMock('schema_editor.string'));
    expect(save).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(save);
    expect(updatedModel.asArray().length).toBe(uiSchemaNodesMock.length + 1);
  });

  test('should show context menu when there are no nodes on root', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: {},
      [Keyword.Definitions]: {},
    };
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchema));
    renderEditor({ appContextProps: { schemaModel } });

    const noItemsSelectedMessage = screen.getByText(textMock('schema_editor.no_item_selected'));
    expect(noItemsSelectedMessage).toBeInTheDocument();

    await clickOpenAddNodeButton();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('should show context menu and trigger correct dispatch when adding text field on a specific node', async () => {
    const jsonSchema: JsonSchema = {
      [Keyword.Properties]: { mockItem: { [Keyword.Type]: FieldType.Object } },
      [Keyword.Definitions]: {},
    };
    const uiSchema = buildUiSchema(jsonSchema);
    const schemaModel = SchemaModel.fromArray(uiSchema);
    renderEditor({ appContextProps: { schemaModel } });
    await clickOpenAddNodeButtonInTree();
    await clickMenuItem(textMock('schema_editor.add_string'));
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
    await user.click(firstDeleteButton);
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
    await user.click(firstDeleteButton);
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
    const type = screen.getByTestId(typeItemId(selectedTypePointer));
    await user.click(type);
    expect(screen.getByRole('heading', { name: typeName, level: 1 })).toBeInTheDocument();
  });

  it('Navigates back to the data model when clicking the "back to data model" link', async () => {
    const setSelectedTypePointer = jest.fn();
    const setSelectedUniquePointer = jest.fn();
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    const dataModelName = 'TestDataModel';

    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        name: dataModelName,
        setSelectedUniquePointer,
      },
    });

    const backButton = screen.getByRole('button', {
      name: textMock('schema_editor.back_to_data_model'),
    });
    await user.click(backButton);
    expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedTypePointer).toHaveBeenCalledWith(undefined);
    expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointer).toHaveBeenCalledWith(undefined);
  });

  it('should not display the type panel when selectedTypePointer is null and selectedNodePointer is null/undefined', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer: null,
        setSelectedUniquePointer: undefined,
      },
    });
    expect(screen.queryByRole('heading', { name: typeName, level: 1 })).not.toBeInTheDocument();
  });

  it('should close the type panel when deleting the selected unused type', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const setSelectedTypePointer = jest.fn();
    const setSelectedUniquePointer = jest.fn();
    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        setSelectedUniquePointer,
      },
    });

    const deleteButton = screen.getAllByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton[0]);
    expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedTypePointer).toHaveBeenCalledWith(null);
    expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointer).toHaveBeenCalledWith(null);
  });

  it('should not close the type panel when deleting a property of the selected type', async () => {
    const schemaModel = SchemaModel.fromArray(buildUiSchema(jsonSchemaTypePanel));
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const setSelectedTypePointer = jest.fn();
    const setSelectedUniquePointer = jest.fn();

    renderEditor({
      appContextProps: {
        schemaModel,
        selectedTypePointer,
        setSelectedTypePointer,
        setSelectedUniquePointer,
      },
    });

    const prop1 = screen.getByTitle(/prop1/i);
    const deleteButton = within(prop1).getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);

    expect(setSelectedTypePointer).not.toHaveBeenCalled();
    expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointer).toHaveBeenCalledWith(null);
  });
});
