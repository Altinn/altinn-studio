import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { Autocomplete } from '@material-ui/lab';
import { MenuItem } from '@material-ui/core';
import SchemaInspector from '../../src/components/SchemaInspector';
import { dataMock } from '../../src/mockData';
import { buildUISchema, resetUniqueNumber } from '../../src/utils';
import { ISchemaState, UiSchemaItem } from '../../src/types';

let mockStore: any = null;
let mockInitialState: ISchemaState;
let createStore: any;
let mockUiSchema: UiSchemaItem[];

const dispatchMock = () => Promise.resolve({});

const mountWithId = (definitionId: string) => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedDefinitionNodeId: definitionId,
    selectedPropertyNodeId: definitionId,
    selectedEditorTab: 'properties',
  });
  mockStore.dispatch = jest.fn(dispatchMock);
  return mountComponent();
};
const mountComponent = () => mount(
  <Provider store={mockStore}>
    <SchemaInspector language={{}} />
  </Provider>,
);

beforeEach(() => {
  mockUiSchema = buildUISchema(dataMock.definitions, '#/definitions');

  mockInitialState = {
    name: 'test',
    saveSchemaUrl: '',
    schema: { properties: {}, definitions: {} },
    uiSchema: [],
    selectedDefinitionNodeId: '#/definitions/Kommentar2000Restriksjon',
    selectedPropertyNodeId: '#/definitions/Kommentar2000Restriksjon',
    selectedEditorTab: 'properties',
  };
  createStore = configureStore();

  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });
  mockStore.dispatch = jest.fn(dispatchMock);
  resetUniqueNumber();
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

it('dispatches correctly when changing restriction key', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
    expect(wrapper).not.toBeNull();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  wrapper.find('#definitionsKommentar2000Restriksjon-minLength-key').last().simulate('change', { target: { value: 'maxLength' } });
  wrapper.find('#definitionsKommentar2000Restriksjon-minLength-key').last().simulate('blur');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setRestrictionKey',
    payload: {
      oldKey: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      newKey: 'maxLength',
    },
  });
});

it('dispatches correctly when changing restriction value', () => {
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
});

it('dispatches correctly when changing node name', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  const input = wrapper.find('#selectedItemName').hostNodes().at(0);

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
      navigate: '#/definitions/Kommentar2000Restriksjon',
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

it('dispatches correctly when changing field key', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M');
  });
  wrapper.find('.MuiTab-root').hostNodes().at(2).simulate('click');
  const input = wrapper.find('#definitionsRA-0678_MpropertiesInternInformasjon-key-6').hostNodes().at(0);
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
});

it('dispatches correctly when changing ref', () => {
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
});

it('supports switching a type into an array and back', () => {
  let wrapper: any = null;
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
  let wrapper: any = null;
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

it('refSelect does not set invalid refs', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M/properties/InternInformasjon');
    wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  });
  wrapper.update();
  wrapper.find(Autocomplete).first().props().onChange(null, 'Tull');
  expect(mockStore.dispatch).not.toHaveBeenCalledWith({ type: 'schemaEditor/setRef' });
});

it('renders no item if nothing is selected', () => {
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
    selectedPropertyNodeId: '',
    selectedDefinitionNodeId: '',
    selectedEditorTab: 'properties',
  });
  act(() => {
    const wrapper = mountComponent();
    expect(wrapper).not.toBeNull();

    expect(wrapper.find('#no-item-paragraph').last().text()).toBe('no_item_selected');
  });
});

it('dispatches correctly when deleting fields', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountWithId('#/definitions/RA-0678_M');
  });
  wrapper.find('.MuiTab-root').hostNodes().at(2).simulate('click');
  wrapper.update();
  wrapper.find('#definitionsRA-0678_MpropertiesdataFormatProvider-delete-1').hostNodes().at(0).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/deleteProperty',
    payload: {
      path: '#/definitions/RA-0678_M/properties/dataFormatProvider',
    },
  });
});

it('dispatches correctly when deleting restrictions', () => {
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
});
it('dispatches correctly when adding enum', () => {
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
});

it('dispatches correctly when deleting enum', () => {
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
});

it('dispatches correctly when adding restrictions', () => {
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
});

it('dispatches correctly when adding fields', () => {
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
      keepSelection: true,
      path: '#/definitions/RA-0678_M',
    },
  });
});

it('dispatches correctly when changing type of combination', () => {
  const wrapper = mountWithId('#/definitions/allOfTest');
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  // https://github.com/mui-org/material-ui/issues/5259#issuecomment-783488623
  wrapper.find('#definitionsallOfTest-change-combination').hostNodes().at(0).simulate('mousedown', { button: 0 });
  wrapper.find(MenuItem).at(2).simulate('click');
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/setCombinationType',
    payload: {
      type: 'oneOf',
      path: '#/definitions/allOfTest',
    },
  });
});

it('dispatches correctly when setting combination to nullable', () => {
  const wrapper = mountWithId('#/definitions/allOfTest');
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  wrapper.find('input[type="checkbox"]').hostNodes().at(0).simulate('change', { target: { checked: true } });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/addCombinationItem',
    payload: {
      path: '#/definitions/allOfTest',
      type: 'null',
      displayName: 'Inline object',
    },
  });
});

it('dispatches correctly when removing nullable option on a combination', () => {
  const wrapper = mountWithId('#/definitions/oneOfTestNullable');
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  wrapper.find('input[type="checkbox"]').hostNodes().at(0).simulate('change', { target: { checked: false } });
  expect(mockStore.dispatch).toHaveBeenCalledWith({
    type: 'schemaEditor/deleteCombinationItem',
    payload: {
      path: '#/definitions/oneOfTestNullable/oneOf/1',
    },
  });
});

it('a ref in a allOf/anyOf/oneOf should not display name', () => {
  const wrapper = mountWithId('#/definitions/allOfTest/allOf/0');
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  expect(wrapper.find('#selectedItemName').hostNodes()).toHaveLength(0);
});

it('an inline object in a allOf/anyOf/oneOf should present a textual visualization and information about inline objects', () => {
  const wrapper = mountWithId('#/definitions/oneOfTestNullable/oneOf/1');
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  expect(wrapper.find('#json-paper').hostNodes()).toHaveLength(1);
  expect(wrapper.find('#information-paper').hostNodes()).toHaveLength(1);
});
