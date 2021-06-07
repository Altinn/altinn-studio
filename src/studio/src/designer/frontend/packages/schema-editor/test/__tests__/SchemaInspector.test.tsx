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

it('dispatches correctly when changing restriction key', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
    expect(wrapper).not.toBeNull();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  setImmediate(() => {
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
});

it('dispatches correctly when changing restriction value', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
    expect(wrapper).not.toBeNull();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(1).simulate('click');
  setImmediate(() => {
    wrapper.find('#definitionsKommentar2000Restriksjon-minLength-value').last().simulate('change', { target: { value: '666' } });
    wrapper.find('#definitionsKommentar2000Restriksjon-minLength-value').last().simulate('blur');
    expect(mockStore.dispatch).toHaveBeenCalledWith({
      type: 'schemaEditor/setFieldValue',
      payload: {
        key: 'minLength',
        path: '#/definitions/Kommentar2000Restriksjon',
        value: 666,
      },
    });

    done();
  });
});

it('dispatches correctly when changing node name', (done) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mountComponent();
    expect(wrapper).not.toBeNull();
  });
  wrapper.find('.MuiTab-root').hostNodes().at(0).simulate('click');
  setImmediate(() => {
    const input = wrapper.find('#definitionsKommentar2000Restriksjon-name').hostNodes().at(0);

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

    done();
  });
});

it('dispatches correctly when changing field key', (done) => {
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
  wrapper.find('.MuiTab-root').hostNodes().at(2).simulate('click');
  // definitionsRA-0678_MpropertiesdataFormatProvider-key-dataFormatProvider
  const input = wrapper.find('#definitionsRA-0678_MpropertiesInternInformasjon-key-InternInformasjon').hostNodes().at(0);
  input.simulate('change', { target: { value: 'Test' } });

  setImmediate(() => {
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
});

// it('dispatches correctly when changing ref', () => {
//   mockStore = createStore({
//     ...mockInitialState,
//     schema: dataMock,
//     uiSchema: mockUiSchema,
//     selectedId: '#/definitions/InternInformasjon',
//   });
//   mockStore.dispatch = jest.fn(dispatchMock);
//   let wrapper: any = null;
//   act(() => {
//     wrapper = mountComponent();
//     wrapper.find(Autocomplete).first().props().onChange(null, 'Dato');
//   });

//   expect(mockStore.dispatch).toHaveBeenCalledWith({
//     type: 'schemaEditor/setRef',
//     payload: {
//       ref: '#/definitions/Dato',
//       path: '#/definitions/InternInformasjon/properties/periodeFritekst',
//     },
//   });
// });

// it('refSelect does not set invalid refs', () => {
//   mockStore = createStore({
//     ...mockInitialState,
//     schema: dataMock,
//     uiSchema: mockUiSchema,
//     selectedId: '#/definitions/InternInformasjon',
//   });
//   mockStore.dispatch = jest.fn(dispatchMock);
//   let wrapper: any = null;
//   act(() => {
//     wrapper = mountComponent();
//     wrapper.find(Autocomplete).first().props().onChange(null, 'Tull');
//   });

//   expect(mockStore.dispatch).not.toHaveBeenCalledWith({ type: 'schemaEditor/setRef' });
// });

// it('dispatches correctly when changing const', () => {
//   mockStore = createStore({
//     ...mockInitialState,
//     schema: dataMock,
//     uiSchema: mockUiSchema,
//     selectedId: '#/definitions/RA-0678_M',
//   });
//   mockStore.dispatch = jest.fn(dispatchMock);
//   let wrapper: any = null;
//   act(() => {
//     wrapper = mountComponent();
//   });

//   wrapper.find('#input-RA-0678_M-properties-dataFormatProvider-value-dataFormatProvider').last().simulate('change', { target: { value: '666' } });
//   expect(mockStore.dispatch).toHaveBeenCalledWith({
//     type: 'schemaEditor/setFieldValue',
//     payload: {
//       key: 'const',
//       path: '#/definitions/RA-0678_M/properties/dataFormatProvider',
//       value: '666',
//     },
//   });
// });

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

    expect(wrapper.find('.no-item-selected').last().text()).toBe('schema_editor.no_item_selected');
  });
});

// it('handles delete button', () => {
//   act(() => {
//     const wrapper = mountComponent();
//     expect(wrapper).not.toBeNull();

//     wrapper.find('#input-Kommentar2000Restriksjon-delete-minLength').last().simulate('click');
//     expect(mockStore.dispatch).toHaveBeenCalledWith({
//       type: 'schemaEditor/deleteField',
//       payload: {
//         key: 'minLength',
//         path: '#/definitions/Kommentar2000Restriksjon',
//       },
//     });
//   });
// });

// it('handles add property button', () => {
//   mockStore = createStore({
//     ...mockInitialState,
//     schema: dataMock,
//     uiSchema: mockUiSchema,
//     selectedId: '#/definitions/InternInformasjon',
//   });
//   act(() => {
//     const wrapper = mountComponent();
//     expect(wrapper).not.toBeNull();

//     wrapper.find('#add-reference-button').last().simulate('click');
//     expect(addPropertyMock).toBeCalledWith('#/definitions/InternInformasjon');
//   });
// });

// it('handles add property (field) button', () => {
//   act(() => {
//     const wrapper = mountComponent();
//     expect(wrapper).not.toBeNull();

//     // #/definitions/OrganisasjonsnummerRestriksjon
//     wrapper.find('#add-property-button').last().simulate('click');
//     expect(mockStore.dispatch).toHaveBeenCalledWith({
//       type: 'schemaEditor/addField',
//       payload: {
//         key: 'key',
//         value: '',
//         path: '#/definitions/Kommentar2000Restriksjon',
//       },
//     });
//   });
// });
