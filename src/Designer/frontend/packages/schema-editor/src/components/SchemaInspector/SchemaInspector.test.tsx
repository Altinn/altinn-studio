import React from 'react';
import { SchemaInspector } from './SchemaInspector';
import { dataMock } from '../../mockData';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CombinationNode, FieldNode, UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  buildUiSchema,
  CombinationKind,
  FieldType,
  ObjectKind,
  ROOT_POINTER,
  SchemaModel,
  validateTestUiSchema,
} from '@altinn/schema-model';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { getSavedModel } from '../../../test/test-utils';
import { nodeMockBase, rootNodeMock } from '../../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

const mockUiSchema = buildUiSchema(dataMock);
const model = SchemaModel.fromArray(mockUiSchema);
const getMockSchemaByPath = (selectedId: string): UiSchemaNode =>
  model.getNodeBySchemaPointer(selectedId);

const saveDataModel = jest.fn();
const setSelectedTypePointer = jest.fn();

const renderSchemaInspector = (uiSchemaMap: UiSchemaNodes, selectedItem?: UiSchemaNode) => {
  const schemaModel = SchemaModel.fromArray(uiSchemaMap);
  return renderWithProviders({
    appContextProps: {
      schemaModel,
      save: saveDataModel,
      setSelectedTypePointer,
      selectedUniquePointer: selectedItem?.schemaPointer,
    },
  })(<SchemaInspector />);
};

describe('SchemaInspector', () => {
  afterEach(jest.clearAllMocks);

  it('Saves data model when entering text in textboxes', async () => {
    renderSchemaInspector(mockUiSchema, getMockSchemaByPath('#/$defs/Kommentar2000Restriksjon'));
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    const textboxes = screen.getAllByRole('textbox');

    for (const textbox of textboxes) {
      await user.clear(textbox);
      await user.type(textbox, 'new-value');
      await user.tab();
    }

    expect(setSelectedTypePointer).toHaveBeenCalledWith('#/$defs/new-value');
    expect(saveDataModel).toHaveBeenCalled();
  });

  test('renders no item if nothing is selected', () => {
    renderSchemaInspector(mockUiSchema);
    const textboxes = screen.queryAllByRole('textbox');
    expect(textboxes).toHaveLength(0);
  });

  it('renders 3 tabs if root is selected', () => {
    renderSchemaInspector(mockUiSchema, getMockSchemaByPath(ROOT_POINTER));
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('Saves data model correctly when changing restriction value', async () => {
    const schemaPointer = '#/$defs/Kommentar2000Restriksjon';

    renderSchemaInspector(mockUiSchema, getMockSchemaByPath(schemaPointer));

    const minLength = '100';
    const maxLength = '666';

    const minLengthTextField = await screen.findByLabelText(textMock('schema_editor.minLength'));
    await user.clear(minLengthTextField);
    await user.type(minLengthTextField, minLength);
    await user.tab();

    expect(saveDataModel).toHaveBeenCalled();
    let updatedModel = getSavedModel(saveDataModel, 3);
    let updatedNode = updatedModel.getNodeBySchemaPointer(schemaPointer) as FieldNode;
    expect(updatedNode.restrictions.minLength).toEqual(parseInt(minLength));

    const maxLengthTextField = await screen.findByLabelText(textMock('schema_editor.maxLength'));
    await user.clear(maxLengthTextField);
    await user.type(maxLengthTextField, maxLength);
    await user.tab();

    updatedModel = getSavedModel(saveDataModel, 7);
    updatedNode = updatedModel.getNodeBySchemaPointer(schemaPointer) as FieldNode;
    expect(updatedNode.restrictions.minLength).toEqual(parseInt(minLength));
  });

  test('Adds new object field when pressing the enter key', async () => {
    const parentNodePointer = '#/properties/test';
    const childNodePointer = '#/properties/test/properties/abc';
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [parentNodePointer],
    };
    const parentNode: FieldNode = {
      ...nodeMockBase,
      schemaPointer: parentNodePointer,
      fieldType: FieldType.Object,
      children: [childNodePointer],
    };
    const childNode: FieldNode = {
      ...nodeMockBase,
      schemaPointer: childNodePointer,
      fieldType: FieldType.String,
    };
    const testUiSchema: UiSchemaNodes = [rootNode, parentNode, childNode];
    validateTestUiSchema(testUiSchema);
    renderSchemaInspector(testUiSchema, parentNode);
    await user.click(getFieldsTab());
    await user.click(screen.getByDisplayValue('abc'));
    await user.keyboard('{Enter}');
    // eslint-disable-next-line testing-library/no-unnecessary-act

    // eslint-disable-next-line testing-library/await-async-utils
    waitFor(() => {
      expect(saveDataModel).toHaveBeenCalledTimes(1);
    });
  });

  test('Adds new valid value field when pressing the enter key', async () => {
    const itemPointer = '#/properties/test';
    const enumValue = 'valid value';
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [itemPointer],
    };
    const item: FieldNode = {
      ...nodeMockBase,
      schemaPointer: itemPointer,
      fieldType: FieldType.String,
      enum: [enumValue],
    };
    const testUiSchema: UiSchemaNodes = [rootNode, item];
    validateTestUiSchema(testUiSchema);
    renderSchemaInspector(testUiSchema, item);

    const enumFieldset = screen.getByRole('group', { name: textMock('schema_editor.enum_legend') });
    const enumField = within(enumFieldset).getAllByRole('textbox');
    expect(enumField).toHaveLength(item.enum.length);

    await user.click(enumField[0]);
    await user.keyboard('{Enter}');

    const enumFieldAfter = within(enumFieldset).getAllByRole('textbox');
    expect(enumFieldAfter).toHaveLength(item.enum.length + 1);

    expect(saveDataModel).not.toHaveBeenCalled();
  });

  it('Does not display the fields tab content when the selected item is a combination', async () => {
    const itemPointer = '#/properties/testcombination';
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [itemPointer],
    };
    const item: CombinationNode = {
      ...nodeMockBase,
      schemaPointer: itemPointer,
      objectKind: ObjectKind.Combination,
      combinationType: CombinationKind.AnyOf,
    };
    const testUiSchema: UiSchemaNodes = [rootNode, item];
    validateTestUiSchema(testUiSchema);
    renderSchemaInspector(testUiSchema, item);
    await user.click(getFieldsTab());
    expect(
      screen.getByText(textMock('schema_editor.fields_not_available_on_type')),
    ).toBeInTheDocument();
  });

  const getFieldsTab = () => screen.getByRole('tab', { name: textMock('schema_editor.fields') });
});
