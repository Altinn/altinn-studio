import React from 'react';
import { act, screen } from '@testing-library/react';
import type { ItemFieldsTabProps } from './ItemFieldsTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  FieldType,
  Keyword,
  ObjectKind,
  createChildNode,
  createNodeBase,
  getNodeByPointer,
} from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders, RenderWithProvidersData } from '../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { validateTestUiSchema } from '../../../../schema-model/test/validateTestUiSchema';
import { nodeMockBase } from '../../../test/mocks/uiSchemaMock';
import { getSavedModel } from '../../../test/test-utils';

const user = userEvent.setup();

// Test data:
const selectedItemPointer = 'test';
const rootItem = {
  ...nodeMockBase,
  fieldType: FieldType.Object,
  children: [`#/properties/${selectedItemPointer}`],
};
const selectedItem: UiSchemaNode = {
  ...createChildNode(rootItem, selectedItemPointer, false),
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
};
const fieldNames = ['Donald', 'Dolly'];
const childNodes = fieldNames.map((childNodeName) => ({
  ...createChildNode(selectedItem, childNodeName, false),
  fieldType: FieldType.String,
}));
const numberOfFields = fieldNames.length;
selectedItem.children = childNodes.map(({ pointer }) => pointer); // eslint-disable-line testing-library/no-node-access
const uiSchema: UiSchemaNodes = [rootItem, selectedItem, ...childNodes];
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

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const renderItemFieldsTab = (
  props: Partial<ItemFieldsTabProps> = {},
  data: Partial<RenderWithProvidersData> = {}
) =>
  renderWithProviders({
    ...data,
    appContextProps: {
      data: uiSchema,
      save: saveDatamodel,
      ...data.appContextProps,
    },
  })(<ItemFieldsTab {...defaultProps} {...props} />);

describe('ItemFieldsTab', () => {
  beforeAll(() => validateTestUiSchema(uiSchema));
  afterEach(jest.clearAllMocks);

  test('Header texts appear', async () => {
    renderItemFieldsTab();
    expect(await screen.findByText(textFieldName)).toBeDefined();
    expect(await screen.findByText(textType)).toBeDefined();
    expect(await screen.findAllByText(textRequired)).toBeDefined();
    expect(await screen.findByText(textDelete)).toBeDefined();
  });

  test('Inputs and delete buttons appear for all fields', async () => {
    renderItemFieldsTab();
    const textboxes = await screen.findAllByLabelText(textFieldName);
    expect(textboxes).toHaveLength(numberOfFields);
    textboxes.forEach((textbox, i) => expect(textbox).toHaveValue(fieldNames[i]));
    expect(screen.getAllByRole('checkbox')).toHaveLength(numberOfFields);
    expect(screen.queryAllByLabelText(textDeleteField)).toHaveLength(numberOfFields);
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
      await act(() => user.click(screen.getAllByRole('combobox')[i]));
      await act(() => user.click(screen.getByRole('option', { name: fieldTypeNames[newType] })));
      await act(() => user.tab());
      expect(saveDatamodel).toHaveBeenCalledTimes(i + 1);
      const updatedModel = getSavedModel(saveDatamodel, i);
      const updatedNode = getNodeByPointer(updatedModel, childNodes[i].pointer);
      expect(updatedNode.fieldType).toEqual(newType);
    }
  });

  test('Model is saved correctly when the "Add field" button is clicked', async () => {
    renderItemFieldsTab();
    await act(() => user.click(screen.getByText(textAdd)));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = getNodeByPointer(updatedModel, selectedItem.pointer);
    expect(updatedNode.children).toHaveLength(numberOfFields + 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Model is saved correctly when a field is focused and the Enter key is clicked', async () => {
    renderItemFieldsTab();
    await act(() => user.click(screen.getAllByRole('textbox')[0]));
    await act(() => user.keyboard('{Enter}'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = getNodeByPointer(updatedModel, selectedItem.pointer);
    expect(updatedNode.children).toHaveLength(numberOfFields + 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Model is saved correctly when delete button is clicked', async () => {
    renderItemFieldsTab();

    const deleteButton = screen.queryAllByLabelText(textDeleteField)[0];
    await act(() => user.click(deleteButton));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', {
      name: texts['schema_editor.datamodel_field_deletion_confirm'],
    });
    await act(() => user.click(confirmButton));

    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = getNodeByPointer(updatedModel, selectedItem.pointer);
    expect(updatedNode.children).toHaveLength(numberOfFields - 1); // eslint-disable-line testing-library/no-node-access
  });

  test('Newly added field gets focus and its text becomes selected', async () => {
    const { rerender } = renderItemFieldsTab();
    const newChildNodeName = 'Skrue';
    const newChildNode = {
      ...createChildNode(selectedItem, newChildNodeName, false),
      fieldType: FieldType.String,
    };
    const newSelectedItem = {
      ...selectedItem,
      // eslint-disable-next-line testing-library/no-node-access
      children: [...selectedItem.children, newChildNode.pointer],
    };
    const newUiSchema = [rootItem, newSelectedItem, ...childNodes, newChildNode];
    validateTestUiSchema(newUiSchema);
    rerender({
      appContextProps: { data: newUiSchema, save: saveDatamodel },
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

  test('Inputs are disabled if the selected item is a reference', async () => {
    const referencedNode = createNodeBase(Keyword.Definitions, 'testtype');
    renderItemFieldsTab(
      {
        selectedItem: {
          ...selectedItem,
          objectKind: ObjectKind.Reference,
          reference: referencedNode.pointer,
        },
      },
      {
        appContextProps: {
          data: [...uiSchema, referencedNode],
        },
      }
    );
    const textboxes = await screen.findAllByLabelText(textFieldName);
    textboxes.forEach((input) => expect(input).toBeDisabled());
    screen.queryAllByRole('checkbox').forEach((input) => expect(input).toBeDisabled());
  });
});
