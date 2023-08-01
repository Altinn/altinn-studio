import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { SchemaInspector } from './SchemaInspector';
import { dataMock } from '../mockData';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  buildUiSchema,
  createChildNode,
  createNodeBase,
  FieldType,
  getNodeByPointer,
  Keyword,
} from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/renderWithProviders';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getSavedModel } from '../../test/test-utils';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';

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
const getMockSchemaByPath = (selectedId: string): UiSchemaNode =>
  getNodeByPointer(mockUiSchema, selectedId);

const texts = {
  'schema_editor.maxLength': 'Maksimal lengde',
  'schema_editor.minLength': 'Minimal lengde',
};

const org = 'org';
const app = 'app';
const modelPath = 'test';
const saveDatamodel = jest.fn();

const renderSchemaInspector = (uiSchemaMap: UiSchemaNodes, selectedItem?: UiSchemaNode) => {
  const store = configureStore()({
    selectedDefinitionNodeId: selectedItem?.pointer,
    selectedEditorTab: 'definitions',
  });

  queryClientMock.setQueryData(
    [QueryKey.Datamodel, org, app, modelPath],
    uiSchemaMap,
  )

  return renderWithProviders({
    state: {
      selectedDefinitionNodeId: selectedItem?.pointer,
      selectedEditorTab: 'definitions',
    },
    selectedSchemaProps: { modelPath },
    servicesContextProps: { saveDatamodel }
  })(
    <Provider store={store}>
      <SchemaInspector selectedItem={selectedItem} />
    </Provider>
  );
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('SchemaInspector', () => {
  afterEach(jest.clearAllMocks);

  it('Saves datamodel when entering text in textboxes', async () => {
    renderSchemaInspector(
      mockUiSchema,
      getMockSchemaByPath('#/$defs/Kommentar2000Restriksjon')
    );
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
    let updatedModel = getSavedModel(saveDatamodel,3);
    let updatedNode = getNodeByPointer(updatedModel, pointer);
    expect(updatedNode.restrictions.minLength).toEqual(parseInt(minLength));

    const maxLengthTextField = await screen.findByLabelText(texts['schema_editor.maxLength']);
    await act(() => user.clear(maxLengthTextField));
    await act(() => user.type(maxLengthTextField, maxLength));
    await act(() => user.tab());

    updatedModel = getSavedModel(saveDatamodel,7);
    updatedNode = getNodeByPointer(updatedModel, pointer);
    expect(updatedNode.restrictions.minLength).toEqual(parseInt(minLength));
  });

  test('Adds new object field when pressing the enter key', async () => {
    const testUiSchema = buildUiSchema({});
    const parentNode = createNodeBase(Keyword.Properties, 'test');
    parentNode.fieldType = FieldType.Object;
    // eslint-disable-next-line testing-library/no-node-access
    parentNode.children = ['#/properties/test/properties/abc'];
    testUiSchema.push(parentNode);
    const childNode = createChildNode(parentNode, 'abc', false);
    testUiSchema.push(childNode);
    renderSchemaInspector(testUiSchema, parentNode);
    await act(() => user.click(screen.queryAllByRole('tab')[1]));
    await act(() => user.click(screen.getByDisplayValue('abc')));
    await act(() => user.keyboard('{Enter}'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  test('Adds new valid value field when pressing the enter key', async () => {
    const testUiSchema = buildUiSchema({});
    const item = createNodeBase(Keyword.Properties, 'test');
    item.fieldType = FieldType.String;
    item.enum = ['valid value'];
    testUiSchema.push(item);
    renderSchemaInspector(testUiSchema, item);
    await act(() => user.click(screen.queryAllByRole('tab')[1]));
    await act(() => user.click(screen.getByDisplayValue('valid value')));
    await act(() => user.keyboard('{Enter}'));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });
});
