import React from 'react';
import { SchemaInspector } from './SchemaInspector';
import { dataMock } from '../../mockData';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  buildUiSchema,
  CombinationKind,
  FieldType,
  ObjectKind,
  SchemaModel,
  validateTestUiSchema,
  type CombinationNode,
  type FieldNode,
  type UiSchemaNode,
  type UiSchemaNodes,
} from '@altinn/schema-model';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { getSavedModel } from '../../../test/test-utils';
import { nodeMockBase, rootNodeMock } from '../../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

const mockUiSchema = buildUiSchema(dataMock);
const model = SchemaModel.fromArray(mockUiSchema);
const getMockSchemaByPath = (selectedId: string): UiSchemaNode => model.getNode(selectedId);

const saveDatamodel = jest.fn();
const setSelectedTypePointer = jest.fn();

const renderSchemaInspector = (uiSchemaMap: UiSchemaNodes, selectedItem?: UiSchemaNode) => {
  const schemaModel = SchemaModel.fromArray(uiSchemaMap);
  return renderWithProviders({
    appContextProps: {
      schemaModel,
      save: saveDatamodel,
      setSelectedTypePointer,
      selectedNodePointer: selectedItem?.pointer,
    },
  })(<SchemaInspector />);
};

describe('SchemaInspector', () => {
  afterEach(jest.clearAllMocks);

  it('Saves datamodel when entering text in textboxes', async () => {
    renderSchemaInspector(mockUiSchema, getMockSchemaByPath('#/$defs/Kommentar2000Restriksjon'));
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    const textboxes = screen.getAllByRole('textbox');

    for (const textbox of textboxes) {
      await act(() => user.clear(textbox));
      await act(() => user.type(textbox, 'new-value'));
      await act(() => user.tab());
    }

    expect(setSelectedTypePointer).toHaveBeenCalledWith('#/$defs/new-value');
    expect(saveDatamodel).toHaveBeenCalled();
  });

  test('renders no item if nothing is selected', () => {
    renderSchemaInspector(mockUiSchema);
    const textboxes = screen.queryAllByRole('textbox');
    expect(textboxes).toHaveLength(0);
  });

  it('Saves datamodel correctly when changing restriction value', async () => {
    const pointer = '#/$defs/Kommentar2000Restriksjon';

    renderSchemaInspector(mockUiSchema, getMockSchemaByPath(pointer));

    const minLength = '100';
    const maxLength = '666';

    const minLengthTextField = await screen.findByLabelText(textMock('schema_editor.minLength'));
    await act(() => user.clear(minLengthTextField));
    await act(() => user.type(minLengthTextField, minLength));
    await act(() => user.tab());

    expect(saveDatamodel).toHaveBeenCalled();
    let updatedModel = getSavedModel(saveDatamodel, 3);
    let updatedNode = updatedModel.getNode(pointer) as FieldNode;
    expect(updatedNode.restrictions.minLength).toEqual(parseInt(minLength));

    const maxLengthTextField = await screen.findByLabelText(textMock('schema_editor.maxLength'));
    await act(() => user.clear(maxLengthTextField));
    await act(() => user.type(maxLengthTextField, maxLength));
    await act(() => user.tab());

    updatedModel = getSavedModel(saveDatamodel, 7);
    updatedNode = updatedModel.getNode(pointer) as FieldNode;
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
      pointer: parentNodePointer,
      fieldType: FieldType.Object,
      children: [childNodePointer],
    };
    const childNode: FieldNode = {
      ...nodeMockBase,
      pointer: childNodePointer,
      fieldType: FieldType.String,
    };
    const testUiSchema: UiSchemaNodes = [rootNode, parentNode, childNode];
    validateTestUiSchema(testUiSchema);
    renderSchemaInspector(testUiSchema, parentNode);
    await act(() => user.click(getFieldsTab()));
    await act(() => user.click(screen.getByDisplayValue('abc')));
    await act(() => user.keyboard('{Enter}'));
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      // eslint-disable-next-line testing-library/await-async-utils
      waitFor(() => {
        expect(saveDatamodel).toHaveBeenCalledTimes(1);
      });
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
      pointer: itemPointer,
      fieldType: FieldType.String,
      enum: [enumValue],
    };
    const testUiSchema: UiSchemaNodes = [rootNode, item];
    validateTestUiSchema(testUiSchema);
    renderSchemaInspector(testUiSchema, item);

    const enumFieldset = screen.getByRole('group', { name: textMock('schema_editor.enum_legend') });
    const enumField = within(enumFieldset).getAllByRole('textbox');
    expect(enumField).toHaveLength(item.enum.length);

    await act(() => user.click(enumField[0]));
    await act(() => user.keyboard('{Enter}'));

    const enumFieldAfter = within(enumFieldset).getAllByRole('textbox');
    expect(enumFieldAfter).toHaveLength(item.enum.length + 1);

    expect(saveDatamodel).not.toHaveBeenCalled();
  });

  it('Does not display the fields tab when the selected item is a combination', async () => {
    const itemPointer = '#/properties/testcombination';
    const rootNode: FieldNode = {
      ...rootNodeMock,
      children: [itemPointer],
    };
    const item: CombinationNode = {
      ...nodeMockBase,
      pointer: itemPointer,
      objectKind: ObjectKind.Combination,
      combinationType: CombinationKind.AnyOf,
    };
    const testUiSchema: UiSchemaNodes = [rootNode, item];
    validateTestUiSchema(testUiSchema);
    renderSchemaInspector(testUiSchema, item);
    await act(() => user.click(getFieldsTab()));
    expect(screen.getByText(textMock('app_data_modelling.fields_information'))).toBeInTheDocument();
  });

  const getFieldsTab = () => screen.getByRole('tab', { name: textMock('schema_editor.fields') });
});
