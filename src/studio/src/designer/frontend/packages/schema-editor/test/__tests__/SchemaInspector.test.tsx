import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import SchemaInspector from '../../src/components/SchemaInspector';
import { dataMock } from '../../src/mockData';
import { buildUISchema } from '../../src/utils';
import { ISchemaState, UiSchemaItem } from '../../src/types';

let mockStore: any = null;
let mockInitialState: ISchemaState;
let createStore: any;
let mockUiSchema: UiSchemaItem[];

const dispatchMock = () => Promise.resolve({});
beforeEach(() => {
  const rootPath = '#/definitions/RA-0678_M';

  mockUiSchema = buildUISchema(dataMock.definitions, '#/definitions');

  mockInitialState = {
    rootName: rootPath,
    saveSchemaUrl: '',
    schema: { properties: {}, definitions: {} },
    uiSchema: [],
    selectedId: '#/definitions/Kommentar2000Restriksjon',
  };
  createStore = configureStore();

  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });
  mockStore.dispatch = jest.fn(dispatchMock);
});

afterEach(() => {
  mockStore = null;
});

it('Should match snapshot', () => {
  act(() => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <SchemaInspector />
      </Provider>,
    );
    expect(wrapper.getDOMNode()).toMatchSnapshot();
  });
});

it('dispatches correctly when changing value', () => {
  act(() => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <SchemaInspector />
      </Provider>,
    );
    expect(wrapper).not.toBeNull();
    expect(wrapper.find('input').length).toBe(10);
    wrapper.find('#input-Kommentar2000Restriksjon-value-minLength').last().simulate('change', { target: { value: '666' } });
    expect(mockStore.dispatch).toHaveBeenCalledWith({
      type: 'schemaEditor/setFieldValue',
      payload: {
        key: 'minLength',
        path: '#/definitions/Kommentar2000Restriksjon',
        value: '666',
      },
    });
  });
});

it('dispatches correctly when changing key', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mount(
      <Provider store={mockStore}>
        <SchemaInspector />
      </Provider>,
    );
  });
  expect(wrapper).not.toBeNull();
  wrapper.find('#input-Kommentar2000Restriksjon-key-minLength').last()
    .simulate('change', { target: { value: 'color' } });

  setImmediate(() => {
    wrapper.update();
    wrapper.find('#input-Kommentar2000Restriksjon-key-color').last().simulate('blur');

    expect(mockStore.dispatch).toHaveBeenCalledWith({
      type: 'schemaEditor/setKey',
      payload: {
        newKey: 'color',
        oldKey: 'minLength',
        path: '#/definitions/Kommentar2000Restriksjon',
      },
    });

    done();
  });
});

it('renders no item if nothing is selected', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedId: null,
  });
  act(() => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <SchemaInspector />
      </Provider>,
    );
    expect(wrapper).not.toBeNull();

    expect(wrapper.find('.no-item-selected').last().text()).toBe('No item selected');
  });
});

it('handles delete button', () => {
  act(() => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <SchemaInspector />
      </Provider>,
    );
    expect(wrapper).not.toBeNull();

    wrapper.find('#input-Kommentar2000Restriksjon-delete-minLength').last().simulate('click');
    expect(mockStore.dispatch).toHaveBeenCalledWith({
      type: 'schemaEditor/deleteField',
      payload: {
        key: 'minLength',
        path: '#/definitions/Kommentar2000Restriksjon',
      },
    });
  });
});
