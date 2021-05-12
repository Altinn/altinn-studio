import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import SchemaEditor from '../../src/components/schemaEditor';
import { dataMock } from '../../src/mockData';
import { buildUISchema } from '../../src/utils';
import { ISchemaState, UiSchemaItem } from '../../src/types';

let mockStore: any = null;
let mockInitialState: ISchemaState;
let createStore: any;
let mockUiSchema: UiSchemaItem[];
const rootPath = '#/definitions/RA-0678_M';

const mountComponent = () => mount(
  <Provider store={mockStore}>
    <SchemaEditor
      schema={dataMock}
      language={{}}
      onSaveSchema={() => {}}
      rootItemId='#/properties/melding'
    />
  </Provider>,
);

beforeEach(() => {
  mockUiSchema = buildUISchema(dataMock.properties, '#/properties')
    .concat(buildUISchema(dataMock.definitions, '#/definitions'));

  mockInitialState = {
    rootName: rootPath,
    saveSchemaUrl: '',
    schema: { properties: {}, definitions: {} },
    uiSchema: [],
  };
  createStore = configureStore();
});

afterEach(() => {
  mockStore = null;
});

test('renders schema editor with populated schema', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });

  let wrapper: ReactWrapper = new ReactWrapper(<div />);
  act(() => {
    wrapper = mountComponent();
  });

  expect(wrapper.find('.schema-editor')).toBeTruthy();
  expect(wrapper.findWhere((n: ReactWrapper) => n.text().includes('Save data model'))).toBeTruthy();
});

test('renders schema editor with button to add root item when schema is empty', () => {
  mockStore = createStore(mockInitialState);

  let wrapper: ReactWrapper = new ReactWrapper(<div />);
  act(() => {
    wrapper = mountComponent();
  });
  expect(wrapper.findWhere((n: ReactWrapper) => n.text().includes('Add root item'))).toBeTruthy();
});

test('Renders properties', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });

  let wrapper: ReactWrapper = new ReactWrapper(<div />);
  act(() => {
    wrapper = mountComponent();
  });
  expect(wrapper.findWhere((n: ReactWrapper) => n.text() === ' const: SERES').length).toBe(0);
  wrapper.find('.MuiTypography-root').at(1).simulate('click');
  wrapper.find('.MuiTypography-root').at(3).simulate('click');
  expect(findTreeItems(wrapper, ' const: SERES').length).toBe(1);
  expect(wrapper.find('.fa-datamodel-object').length).toBe(48);
});

const findTreeItems = (wrapper: ReactWrapper, text: string) => wrapper.find('.MuiTypography-root').findWhere((r: ReactWrapper) => r.text() === text);

test('Supports allOf', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });

  let wrapper: ReactWrapper = new ReactWrapper(<div />);
  act(() => {
    wrapper = mountComponent();
  });
  const allOfTest = findTreeItems(wrapper, ' allOfTest').last();
  expect(allOfTest.text()).toBe(' allOfTest');
  allOfTest.simulate('click');

  expect(wrapper.find('.MuiTypography-root').length).toBe(127);
  expect(wrapper.find('.MuiTypography-root').at(50).text()).toBe(' allOf');
  wrapper.find('.MuiTypography-root').at(50).simulate('click'); // expand allOf

  expect(wrapper.find('.MuiTypography-root').at(51).text()).toBe(' Tekst_50 : Tekst_50Restriksjon');
});
