import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { ItemFieldsTabProps } from './ItemFieldsTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import type { FieldNode, UiSchemaNodes } from '@altinn/schema-model';
import { FieldType, ObjectKind, SchemaModel } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { renderWithProviders, RenderWithProvidersData } from '../../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { validateTestUiSchema } from '../../../../../schema-model';
import { nodeMockBase, rootNodeMock } from '../../../../test/mocks/uiSchemaMock';
import { getSavedModel } from '../../../../test/test-utils';

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
  pointer: selectedItemPointer,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  children: [childNode1Pointer, childNode2Pointer],
};
const childNode1: FieldNode = {
  ...nodeMockBase,
  pointer: childNode1Pointer,
};
const childNode2: FieldNode = {
  ...nodeMockBase,
  pointer: childNode2Pointer,
};
const childNodes = [childNode1, childNode2];
const numberOfFields = selectedItem.children.length; // eslint-disable-line testing-library/no-node-access
const uiSchema: UiSchemaNodes = [rootItem, selectedItem, childNode1, childNode2];
const textAdd = 'Legg til felt';
const textDelete = 'Slett';
const textDeleteField = 'Slett felt';
const textFieldName = 'Navn på felt';
const textRequired = 'Påkrevd';
const textType = 'Type';
const fieldTypeNames = {
  [FieldType.Boolean]: 'Ja/nei',
  [FieldType.Integer]: 'Helt tall',
  [FieldType.Number]: 'Desimaltall',
  [FieldType.Object]: 'Objekt',
  [FieldType.String]: 'Tekst',
};
const texts = {
  'schema_editor.add_property': textAdd,
  'schema_editor.delete': textDelete,
  'schema_editor.delete_field': textDeleteField,
  'schema_editor.field_name': textFieldName,
  'schema_editor.required': textRequired,
  'schema_editor.type': textType,
  'schema.editor.number': fieldTypeNames[FieldType.Number],
  'schema_editor.boolean': fieldTypeNames[FieldType.Boolean],
  'schema_editor.integer': fieldTypeNames[FieldType.Integer],
  'schema_editor.object': fieldTypeNames[FieldType.Object],
  'schema_editor.string': fieldTypeNames[FieldType.String],
  'schema_editor.datamodel_field_deletion_confirm': 'Confirm',
};
const defaultProps: ItemFieldsTabProps = { selectedItem };
const saveDatamodel = jest.fn();
const model = SchemaModel.fromArray(uiSchema);
const createModel = () => model.deepClone();

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const renderItemFieldsTab = (
  props: Partial<ItemFieldsTabProps> = {},
  data: Partial<RenderWithProvidersData> = {},
) =>
  renderWithProviders({
    ...data,
    appContextProps: {
      schemaModel: createModel(),
      save: saveDatamodel,
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

  test('Model is saved with correct payload when a name is changed', async () => {
    renderItemFieldsTab();
    const suffix = 'Duck';
    for (const fieldName of fieldNames) {
      await act(() => user.type(screen.getByDisplayValue(fieldName), suffix));
      await act(() => user.tab());
    }
    expect(saveDatamodel).toHaveBeenCalledTimes(numberOfFields);
  });

  test('Model is saved correctly when a type is changed', async () => {
    renderItemFieldsTab();
    const newType = FieldType.Integer;
    for (let i = 0; i < fieldNames.length; i++) {
      await act(() => user.selectOptions(screen.getAllByRole('combobox')[i], newType));
      expect(saveDatamodel).toHaveBeenCalledTimes(i + 1);
      const updatedModel = getSavedModel(saveDatamodel, i);
      const updatedNode = updatedModel.getNode(childNodes[i].pointer) as FieldNode;
      expect(updatedNode.fieldType).toEqual(newType);
    }
  });

  test('Model is saved correctly when the "Add field" button is clicked', async () => {
    renderItemFieldsTab();
    await act(() => user.click(screen.getByText(textAdd)));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(selectedItem.pointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfFields + 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Model is saved correctly when a field is focused and the Enter key is clicked', async () => {
    renderItemFieldsTab();
    await act(() => user.click(screen.getAllByRole('textbox')[0]));
    await act(() => user.keyboard('{Enter}'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(selectedItem.pointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfFields + 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Model is saved correctly when delete button is clicked', async () => {
    renderItemFieldsTab();

    const deleteButton = screen.getAllByRole('button', { name: textDeleteField })[0];
    await act(() => user.click(deleteButton));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', {
      name: texts['schema_editor.datamodel_field_deletion_confirm'],
    });
    await waitFor(async () => user.click(confirmButton));

    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(selectedItem.pointer) as FieldNode;
    expect(updatedNode.children).toHaveLength(numberOfFields - 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Newly added field gets focus and its text becomes selected', async () => {
    const { rerender } = renderItemFieldsTab();
    const newChildNodeName = 'Skrue';
    const newChildNodePointer = `${selectedItemPointer}/properties/${newChildNodeName}`;
    const newChildNode: FieldNode = {
      ...nodeMockBase,
      pointer: newChildNodePointer,
    };
    const newSelectedItem = {
      ...selectedItem,
      // eslint-disable-next-line testing-library/no-node-access
      children: [...selectedItem.children, newChildNodePointer],
    };
    const newUiSchema = [rootItem, newSelectedItem, ...childNodes, newChildNode];
    validateTestUiSchema(newUiSchema);
    rerender({
      appContextProps: { schemaModel: SchemaModel.fromArray(newUiSchema), save: saveDatamodel },
    })(<ItemFieldsTab {...defaultProps} selectedItem={newSelectedItem} />);
    expect(screen.getByDisplayValue(newChildNodeName)).toHaveFocus();
    await act(() => user.keyboard('a')); // Should replace the current value since the text should be selected
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
