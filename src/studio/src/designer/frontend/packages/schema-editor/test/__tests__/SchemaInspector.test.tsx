/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { Autocomplete } from '@material-ui/lab';
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

const mountWithId = (id: string) => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedId: id,
  });
  mockStore.dispatch = jest.fn(dispatchMock);
  return mountComponent();
};
const mountComponent = () => mount(
  <Provider store={mockStore}>
    <SchemaInspector onAddPropertyClick={addPropertyMock} language={{}} />
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

it('Should match snapshot (enums)', () => {
  act(() => {
    const wrapper = mountWithId('#/definitions/StatistiskeEnhetstyper');
    wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
    expect(wrapper.getDOMNode()).toMatchSnapshot('enums');
  });
});

it('Should match snapshot (restrictions)', () => {
  act(() => {
    const wrapper = mountWithId('#/definitions/Tekst_09Restriksjon');
    wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
    expect(wrapper.getDOMNode()).toMatchSnapshot('restrictions');
  });
});

it('dispatches correctly when changing restriction key', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
    expect(wrapper).not.toBeNull();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.find('#definitionsKommentar2000Restriksjon-minLength-key').last().simulate('change', { target: { value: 'maxLength' } });
  wrapper.find('#definitionsKommentar2000Restriksjon-minLength-key').last().simulate('blur');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setKey',
    payload: {
      oldKey: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      newKey: 'maxLength',
    },
  });
  done();
});

it('dispatches correctly when changing restriction value', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.find('#definitionsKommentar2000Restriksjon-minLength-value').last().simulate('change', { target: { value: '666' } });
  wrapper.find('#definitionsKommentar2000Restriksjon-minLength-value').last().simulate('blur');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setRestriction',
    payload: {
      key: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      value: 666,
    },
  });

  done();
});

it('dispatches correctly when changing node name', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  const input = wrapper.find('#definitionsKommentar2000Restriksjon-name').hostNodes().at(0);

  input.simulate('change', { target: { value: '22test' } });
  input.simulate('blur');
  expect(mockStore.dispatch).not.toHaveBeenCalledWith({
    type: 'schemaEditor/setPropertyName',
  });

  input.simulate('change', { target: { value: 'test' } });
  input.simulate('blur');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setPropertyName',
    payload: {
      name: 'test',
      navigate: true,
      path: '#/definitions/Kommentar2000Restriksjon',
    },
  });

  input.simulate('change', { target: { value: 'æåå' } });
  input.simulate('blur');
  expect(mockStore.dispatch).not.toHaveBeenCalledWith({
    type: 'schemaEditor/setPropertyName',
    name: 'æåå',
  });
});

it('dispatches correctly when changing field key', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M');
  });
  wrapper.find('.MuiTab-root').hostNodes().at(2).simulate('click');
  const input = wrapper.find('#definitionsRA-0678_MpropertiesInternInformasjon-key-InternInformasjon').hostNodes().at(0);
  input.simulate('change', { target: { value: 'Test' } });
  wrapper.update();
  input.simulate('blur');

  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setPropertyName',
    payload: {
      name: 'Test',
      path: '#/definitions/RA-0678_M/properties/InternInformasjon',
    },
  });
  done();
});

it('dispatches correctly when changing ref', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M/properties/InternInformasjon');
    wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  });
  wrapper.update();
  wrapper.find(Autocomplete).first().props().onChange(null, 'Dato');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setRef',
    payload: {
      ref: '#/definitions/Dato',
      path: '#/definitions/RA-0678_M/properties/InternInformasjon',
    },
  });

  done();
});

it('supports switching a type into an array and back', () => {
  let wrapper:any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M/properties/dataFormatVersion');
    wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  });

  wrapper.find('input[type="checkbox"]').hostNodes().at(0)
    .simulate('change', { target: { checked: true } });
  wrapper.update();

  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setType',
    payload: {
      path: '#/definitions/RA-0678_M/properties/dataFormatVersion',
      value: 'array',
    },
  });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setItems',
    payload: {
      path: '#/definitions/RA-0678_M/properties/dataFormatVersion',
      items: {
        type: 'string',
      },
    },
  });
  // switch back into string
  wrapper.find('input[type="checkbox"]').hostNodes().at(0)
    .simulate('change', { target: { checked: false } });

  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setType',
    payload: {
      path: '#/definitions/RA-0678_M/properties/dataFormatVersion',
      value: 'string',
    },
  });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setItems',
    payload: {
      path: '#/definitions/RA-0678_M/properties/dataFormatVersion',
      items: undefined,
    },
  });
});

it('supports switching a reference into an array and back', () => {
  let wrapper:any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M/properties/InternInformasjon');
    wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  });

  wrapper.find('input[type="checkbox"]').hostNodes().at(0)
    .simulate('change', { target: { checked: true } });
  wrapper.update();

  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setType',
    payload: {
      path: '#/definitions/RA-0678_M/properties/InternInformasjon',
      value: 'array',
    },
  });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setItems',
    payload: {
      path: '#/definitions/RA-0678_M/properties/InternInformasjon',
      items: {
        $ref: '#/definitions/InternInformasjon',
      },
    },
  });
  // switch back into reference
  wrapper.find('input[type="checkbox"]').hostNodes().at(0)
    .simulate('change', { target: { checked: false } });

  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setRef',
    payload: {
      path: '#/definitions/RA-0678_M/properties/InternInformasjon',
      ref: '#/definitions/InternInformasjon',
    },
  });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setItems',
    payload: {
      path: '#/definitions/RA-0678_M/properties/InternInformasjon',
      items: undefined,
    },
  });
});

it('refSelect does not set invalid refs', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M/properties/InternInformasjon');
    wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  });
  wrapper.update();
  wrapper.find(Autocomplete).first().props().onChange(null, 'Tull');
  expect(mockStore.dispatch).not.toHaveBeenCalledWith({ type: 'schemaEditor/setRef' });
  done();
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

    expect(wrapper.find('.no-item-selected').last().text()).toBe('no_item_selected');
  });
});

it('dispatches correctly when deleting fields', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M');
  });
  wrapper.find('.MuiTab-root').hostNodes().at(2).simulate('click');
  wrapper.update();
  wrapper.find('#definitionsRA-0678_MpropertiesdataFormatProvider-delete-dataFormatProvider').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/deleteProperty',
    payload: {
      path: '#/definitions/RA-0678_M/properties/dataFormatProvider',
    },
  });
  done();
});

it('dispatches correctly when deleting restrictions', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.update();
  wrapper.find('#definitionsKommentar2000Restriksjon-delete-maxLength').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/deleteField',
    payload: {
      key: 'maxLength',
      path: '#/definitions/Kommentar2000Restriksjon',
    },
  });
  done();
});
it('dispatches correctly when adding enum', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/Kommentar2000Restriksjon');
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.update();
  wrapper.find('#add-enum-button').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/addEnum',
    payload: {
      value: 'value',
      path: '#/definitions/Kommentar2000Restriksjon',
    },
  });
  done();
});

it('dispatches correctly when deleting enum', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/DriftsstatusPeriode');
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.update();
  wrapper.find('#definitionsDriftsstatusPeriode-delete-jaDrift').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/deleteEnum',
    payload: {
      value: 'jaDrift',
      path: '#/definitions/DriftsstatusPeriode',
    },
  });
  done();
});

it('dispatches correctly when adding restrictions', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.update();
  wrapper.find('#add-restriction-button').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/addRestriction',
    payload: {
      key: '',
      path: '#/definitions/Kommentar2000Restriksjon',
      value: '',
    },
  });
  done();
});

it('dispatches correctly when adding fields', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M');
  });

  wrapper.find('.MuiTab-root').hostNodes().at(2).simulate('click');
  wrapper.update();
  wrapper.find('#add-property-button').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/addProperty',
    payload: {
      path: '#/definitions/RA-0678_M',
    },
  });
  done();
});
