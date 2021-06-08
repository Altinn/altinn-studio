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

const findTreeItems = (wrapper: ReactWrapper, text: string) => wrapper.find('.MuiTypography-root').findWhere((r: ReactWrapper) => r.text() === text);

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
  wrapper.find('.MuiTypography-root').at(1).simulate('click');

  expect(findTreeItems(wrapper, ' dataFormatProvider').length).toBe(4);
});
