import React from 'react';
import { screen } from '@testing-library/react';
import type { ItemFieldsTabProps } from './ItemFieldsTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import type { FieldNode, UiSchemaNodes } from '@altinn/schema-model';
import { FieldType, ObjectKind, SchemaModel, validateTestUiSchema } from '@altinn/schema-model';
import type { RenderWithProvidersData } from '../../../../test/renderWithProviders';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { nodeMockBase, rootNodeMock } from '../../../../test/mocks/uiSchemaMock';
import { getSavedModel } from '../../../../test/test-utils';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const selectedItemPointer = '#/properties/test';
const fieldNames = ['Donald', 'Dolly'];
const childNode1Pointer = '#/properties/test/properties/Donald';
const childNode2Pointer = '#/properties/test/properties/Dolly';
const rootItem = {
  ...rootNodeMock,
  children: [selectedItemPointer],
};
const selectedItem: FieldNode = {
  ...nodeMockBase,
  schemaPointer: selectedItemPointer,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  children: [childNode1Pointer, childNode2Pointer],
};
const childNode1: FieldNode = {
  ...nodeMockBase,
  schemaPointer: childNode1Pointer,
};
const childNode2: FieldNode = {
  ...nodeMockBase,
  schemaPointer: childNode2Pointer,
};
const childNodes = [childNode1, childNode2];
const numberOfFields = selectedItem.children.length; // eslint-disable-line testing-library/no-node-access
const uiSchema: UiSchemaNodes = [rootItem, selectedItem, childNode1, childNode2];
const textAdd = textMock('schema_editor.add_property');
const textDelete = textMock('schema_editor.delete');
const textDeleteField = textMock('schema_editor.delete_field');
const textFieldName = textMock('schema_editor.field_name');
const textRequired = textMock('schema_editor.required');
const textType = textMock('schema_editor.type');

const defaultProps: ItemFieldsTabProps = { selectedItem };
const saveDataModel = jest.fn();
const model = SchemaModel.fromArray(uiSchema);
const createModel = () => model.deepClone();

const renderItemFieldsTab = (
  props: Partial<ItemFieldsTabProps> = {},
  data: Partial<RenderWithProvidersData> = {},
) =>
  renderWithProviders({
    ...data,
    appContextProps: {
      schemaModel: createModel(),
      save: saveDataModel,
      ...data.appContextProps,
    },
  })(<ItemFieldsTab {...defaultProps} {...props} />);

describe('ItemFieldsTab', () => {
  beforeAll(() => validateTestUiSchema(uiSchema));
  afterEach(jest.clearAllMocks);

  test('Header texts appear', () => {
    renderItemFieldsTab();
    expect(screen.getByRole('columnheader', { name: textFieldName })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: textType })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: textRequired })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: textDelete })).toBeDefined();
  });

  test('Inputs and delete buttons appear for all fields', async () => {
    renderItemFieldsTab();
    const textboxes = await screen.findAllByLabelText(textFieldName);
    expect(textboxes).toHaveLength(numberOfFields);
    textboxes.forEach((textbox, i) => expect(textbox).toHaveValue(fieldNames[i]));
    expect(screen.getAllByRole('checkbox')).toHaveLength(numberOfFields);
    expect(
      screen.getAllByRole('button', {
        name: textDeleteField,
      }),
    ).toHaveLength(numberOfFields);
  });

  test('"Add property" button appears', async () => {
    renderItemFieldsTab();
    expect(await screen.findByText(textAdd)).toBeDefined();
  });

  test('Should save the model when user clicks the dropdown menu items', async () => {
    renderItemFieldsTab();
    const selectButton = async (item: string) => {
      await user.click(screen.getByText(textAdd));
      await user.click(screen.getByRole('button', { name: item }));
    };
    await selectButton(textMock('schema_editor.add_number'));
    expect(saveDataModel).toHaveBeenCalledTimes(1);
    await selectButton(textMock('schema_editor.add_string'));
    expect(saveDataModel).toHaveBeenCalledTimes(2);
    await selectButton(textMock('schema_editor.add_integer'));
    expect(saveDataModel).toHaveBeenCalledTimes(3);
    await selectButton(textMock('schema_editor.add_boolean'));
    expect(saveDataModel).toHaveBeenCalledTimes(4);
    await selectButton(textMock('schema_editor.add_object'));
    expect(saveDataModel).toHaveBeenCalledTimes(5);
  });

  test('Should show dropdown menu items when the "Add field" button is clicked', async () => {
    renderItemFieldsTab();
    await user.click(screen.getByText(textAdd));
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_number') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_string') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_integer') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_boolean') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_object') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_combination') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('schema_editor.add_reference') }),
    ).toBeInTheDocument();
  });

  test('Model is saved with correct payload when a name is changed', async () => {
    renderItemFieldsTab();
    const suffix = 'Duck';
    for (const fieldName of fieldNames) {
      await user.type(screen.getByDisplayValue(fieldName), suffix);
      await user.tab();
    }
    expect(saveDataModel).toHaveBeenCalledTimes(numberOfFields);
  });

  test('Model is saved correctly when a field is focused and the Enter key is clicked', async () => {
    renderItemFieldsTab();
    await user.click(screen.getAllByRole('textbox')[0]);
    await user.keyboard('{Enter}');
    expect(saveDataModel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDataModel);
    const updatedNode = updatedModel.getNodeBySchemaPointer(
      selectedItem.schemaPointer,
    ) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfFields + 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Model is saved correctly when delete button is clicked', async () => {
    renderItemFieldsTab();

    const deleteButton = screen.getAllByRole('button', { name: textDeleteField })[0];
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', {
      name: textMock('schema_editor.data_model_field_deletion_confirm'),
    });
    await user.click(confirmButton);

    expect(saveDataModel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDataModel);
    const updatedNode = updatedModel.getNodeBySchemaPointer(
      selectedItem.schemaPointer,
    ) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfFields - 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Newly added field gets focus and its text becomes selected', async () => {
    const { rerender } = renderItemFieldsTab();
    const newChildNodeName = 'Skrue';
    const newChildNodePointer = `${selectedItemPointer}/properties/${newChildNodeName}`;
    const newChildNode: FieldNode = {
      ...nodeMockBase,
      schemaPointer: newChildNodePointer,
    };
    const newSelectedItem = {
      ...selectedItem,
      // eslint-disable-next-line testing-library/no-node-access
      children: [...selectedItem.children, newChildNodePointer],
    };
    const newUiSchema = [rootItem, newSelectedItem, ...childNodes, newChildNode];
    validateTestUiSchema(newUiSchema);
    rerender({
      appContextProps: { schemaModel: SchemaModel.fromArray(newUiSchema), save: saveDataModel },
    })(<ItemFieldsTab {...defaultProps} selectedItem={newSelectedItem} />);
    expect(screen.getByDisplayValue(newChildNodeName)).toHaveFocus();
    await user.keyboard('a'); // Should replace the current value since the text should be selected
    expect(screen.getByDisplayValue('a')).toBeDefined();
    expect(screen.queryByDisplayValue(newChildNodeName)).toBeFalsy();
  });

  test('Inputs are enabled by default', async () => {
    renderItemFieldsTab();
    const textboxes = await screen.findAllByRole('textbox');
    textboxes.forEach((input) => expect(input).toBeEnabled());
    screen.queryAllByRole('checkbox').forEach((input) => expect(input).toBeEnabled());
  });
});
