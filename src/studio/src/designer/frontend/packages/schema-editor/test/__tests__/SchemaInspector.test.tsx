import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import SchemaInspector from '../../src/components/SchemaInspector';
import { dataMock } from '../../src/mockData';
import { buildUISchema } from '../../src/utils';
import { ISchemaState, UiSchemaItem } from '../../src/types';

let container: any = null;
let mockStore: any = null;
let mockInitialState: ISchemaState;
let createStore: any;
let mockUiSchema: UiSchemaItem[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  const rootPath = '#/definitions/RA-0678_M';

  mockUiSchema = buildUISchema(dataMock.definitions, '#/definitions');

  mockInitialState = {
    rootName: rootPath,
    saveSchemaUrl: '',
    schema: { properties: [], definitions: [] },
    uiSchema: [],
    selectedId: '#/definitions/Kommentar2000Restriksjon',
  };
  createStore = configureStore();
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
  mockStore = null;
});

it('Should match snapshot', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });
  let wrapper: any = null;
  act(() => {
    wrapper = mount(
      <Provider store={mockStore}>
        <SchemaInspector />
      </Provider>,
    );
  });
  expect(wrapper.getDOMNode()).toMatchSnapshot();
});
