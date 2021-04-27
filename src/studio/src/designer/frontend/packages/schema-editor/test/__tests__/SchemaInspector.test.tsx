import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { Select } from '@material-ui/core';
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
let addPropertyMock = jest.fn();

const mountComponent = () => mount(
  <Provider store={mockStore}>
    <SchemaInspector onAddPropertyClick={addPropertyMock} />
  </Provider>,
);

beforeEach(() => {
  const rootPath = '#/definitions/RA-0678_M';
  addPropertyMock = jest.fn();
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
    const wrapper = mountComponent();
    expect(wrapper.getDOMNode()).toMatchSnapshot();
  });
});

it('dispatches correctly when changing value', () => {
  act(() => {
    const wrapper = mountComponent();
    expect(wrapper).not.toBeNull();
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
    wrapper = mountComponent();
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

it('dispatches correctly when changing ref', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedId: '#/definitions/InternInformasjon',
  });
  mockStore.dispatch = jest.fn(dispatchMock);
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
    wrapper.find(Select).first().props().onChange({ target: { value: '#/definitions/Tidsrom' } });
  });

  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setRef',
    payload: {
      ref: '#/definitions/Tidsrom',
      path: '#/definitions/InternInformasjon/properties/periodeFritekst',
    },
  });
});

it('dispatches correctly when changing const', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedId: '#/definitions/RA-0678_M',
  });
  mockStore.dispatch = jest.fn(dispatchMock);
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
  });

  wrapper.find('#input-RA-0678_M-properties-dataFormatProvider-value-dataFormatProvider').last().simulate('change', { target: { value: '666' } });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setFieldValue',
    payload: {
      key: 'const',
      path: '#/definitions/RA-0678_M/properties/dataFormatProvider',
      value: '666',
    },
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
    const wrapper = mountComponent();
    expect(wrapper).not.toBeNull();

    expect(wrapper.find('.no-item-selected').last().text()).toBe('No item selected');
  });
});

it('handles delete button', () => {
  act(() => {
    const wrapper = mountComponent();
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

it('handles add property button', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedId: '#/definitions/InternInformasjon',
  });
  act(() => {
    const wrapper = mountComponent();
    expect(wrapper).not.toBeNull();

    wrapper.find('#add-reference-button').last().simulate('click');
    expect(addPropertyMock).toBeCalledWith('#/definitions/InternInformasjon');
  });
});

it('handles add property (field) button', () => {
  act(() => {
    const wrapper = mountComponent();
    expect(wrapper).not.toBeNull();

    // #/definitions/OrganisasjonsnummerRestriksjon
    wrapper.find('#add-property-button').last().simulate('click');
    expect(mockStore.dispatch).toHaveBeenCalledWith({
      type: 'schemaEditor/addField',
      payload: {
        key: 'key',
        value: 'value',
        path: '#/definitions/Kommentar2000Restriksjon',
      },
    });
  });
});

it('renders const properties', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedId: '#/definitions/RA-0678_M',
  });
  act(() => {
    const wrapper = mountComponent();
    expect(wrapper).not.toBeNull();

    expect(wrapper.find('input').get(1).props.value).toBe('dataFormatProvider');
    expect(wrapper.find('input').get(2).props.value).toBe('SERES');
  });
});
