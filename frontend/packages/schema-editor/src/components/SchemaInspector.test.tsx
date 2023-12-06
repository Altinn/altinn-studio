import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { SchemaInspector } from './SchemaInspector';
import { dataMock } from '../mockData';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FieldNode, UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import { buildUiSchema, FieldType, SchemaModel, validateTestUiSchema } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/renderWithProviders';
import { getSavedModel } from '../../test/test-utils';
import { nodeMockBase, rootNodeMock } from '../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
const mockUiSchema = buildUiSchema(dataMock);
const model = SchemaModel.fromArray(mockUiSchema);
const getMockSchemaByPath = (selectedId: string): UiSchemaNode => model.getNode(selectedId);

const texts = {
  'schema_editor.maxLength': 'Maksimal lengde',
  'schema_editor.minLength': 'Minimal lengde',
};

const saveDatamodel = jest.fn();
const setSelectedTypePointer = jest.fn();

const renderSchemaInspector = (uiSchemaMap: UiSchemaNodes, selectedItem?: UiSchemaNode) => {
  const schemaModel = SchemaModel.fromArray(uiSchemaMap);
  const store = configureStore()({
    selectedDefinitionNodeId: selectedItem?.pointer,
    selectedEditorTab: 'definitions',
  });

  return renderWithProviders({
    state: {
      selectedDefinitionNodeId: selectedItem?.pointer,
      selectedEditorTab: 'definitions',
    },
    appContextProps: {
      schemaModel,
      save: saveDatamodel,
      setSelectedTypePointer,
    },
  })(
    <Provider store={store}>
      <SchemaInspector />
    </Provider>,
  );
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('SchemaInspector', () => {
  afterEach(jest.clearAllMocks);

  it('Saves datamodel when entering text in textboxes', async () => {
    renderSchemaInspector(mockUiSchema, getMockSchemaByPath('#/$defs/Kommentar2000Restriksjon'));
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeDefined();
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(1);
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

    const minLengthTextField = await screen.findByLabelText(texts['schema_editor.minLength']);
    await act(() => user.clear(minLengthTextField));
    await act(() => user.type(minLengthTextField, minLength));
    await act(() => user.tab());

    expect(saveDatamodel).toHaveBeenCalled();
    let updatedModel = getSavedModel(saveDatamodel, 3);
    let updatedNode = updatedModel.getNode(pointer) as FieldNode;
    expect(updatedNode.restrictions.minLength).toEqual(parseInt(minLength));

    const maxLengthTextField = await screen.findByLabelText(texts['schema_editor.maxLength']);
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
    await act(() => user.click(screen.queryAllByRole('tab')[1]));
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
    await act(() => user.click(screen.queryAllByRole('tab')[1]));
    await act(() => user.click(screen.getByDisplayValue(enumValue)));
    await act(() => user.keyboard('{Enter}'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });
});
