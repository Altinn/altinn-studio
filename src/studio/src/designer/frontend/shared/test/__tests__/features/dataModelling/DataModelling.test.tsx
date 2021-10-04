import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import DataModelling from '../../../../features/dataModelling';
import CreateNewWrapper from '../../../../features/dataModelling/components/CreateNewWrapper';
import { SchemaSelect } from '../../../../features/dataModelling/components';
import DeleteWrapper from '../../../../features/dataModelling/components/DeleteWrapper';

describe('>>> DataModelling.tsx', () => {
  const language = { administration: Object({ first: 'some text', second: 'other text' }) };
  let wrapper: any = null;
  let store: any;
  const modelName = 'some-existing-model';
  const modelName2 = 'some-other-model';
  const initialState = {
    dataModelsMetadataState: {
      dataModelsMetadata: [
        {
          repositoryRelativeUrl: `/App/models/${modelName}.schema.json`,
          fileName: `${modelName}.schema.json`,
          fileType: '.json',
        },
        {
          repositoryRelativeUrl: `/App/models/${modelName2}.schema.json`,
          fileName: `${modelName2}.schema.json`,
          fileType: '.json',
        },
      ],
    },
    dataModelling: {
      schema: {},
      saving: false,
    },
  };
  const dispatchMock = () => Promise.resolve({});
  const initialStoreCall = {
    type: 'dataModelling/fetchDataModel',
    payload: {
      metadata: {
        label: modelName,
        value: initialState.dataModelsMetadataState.dataModelsMetadata[0],
      },
    },
  };
  let preferredLabel: {label: string, clear: () => void} = null;
  const clear = jest.fn();

  beforeEach(() => {
    wrapper = null;
    preferredLabel = null;
    store = configureStore()(initialState);
    store.dispatch = jest.fn(dispatchMock);
    clear.mockReset();
  });
  const mountComponent = (props?: any) => mount(
    React.createElement(({ preferredOptionLabel }: any = {}) => (
      <Provider store={store} >
        <DataModelling
          language={language}
          preferredOptionLabel={preferredOptionLabel || undefined}
        />
      </Provider>
    ), props),
  );
  it('has the toolbar', () => {
    act(() => {
      wrapper = mountComponent();
    });
    const createNewWrapper = wrapper.find(CreateNewWrapper);
    expect(createNewWrapper).toHaveLength(1);
    const schemaSelect = wrapper.find(SchemaSelect);
    expect(schemaSelect).toHaveLength(1);
    const deleteWrapper = wrapper.find(DeleteWrapper);
    expect(deleteWrapper).toHaveLength(1);
  });

  it('selects the preferred model', () => {
    preferredLabel = { label: modelName2,
      clear: () => {
        preferredLabel = undefined; // note that a clear function should set state that causes the preferred label
        clear();
      } };
    expect(clear).toHaveBeenCalledTimes(0);
    act(() => {
      wrapper = mountComponent({ preferredOptionLabel: preferredLabel });
    });
    wrapper.update();
    expect(clear).toHaveBeenCalledTimes(1);
    const schemaSelect = wrapper.find(SchemaSelect);
    expect(schemaSelect).toHaveLength(1);
    const dataModelling = wrapper.find(DataModelling);
    expect(dataModelling).toHaveLength(1);
    expect(schemaSelect.find('Select').props().value.label).toBe(modelName2);
    expect(dataModelling.find('SchemaEditorApp').props().name).toBe(modelName2);
  });

  it('does not run clear after preferred model has been selected', () => {
    expect(clear).toHaveBeenCalledTimes(0);
    preferredLabel = { label: modelName2,
      clear: () => {
        preferredLabel = undefined; // note that a clear function should set state that causes the preferred label
        clear();
      } };
    act(() => {
      wrapper = mountComponent({ preferredOptionLabel: preferredLabel });
    });
    wrapper.update();
    expect(preferredLabel).toBeUndefined(); // the clear function has removed the outside prop
    act(() => { // update the props to reflect changes in outside props.
      wrapper.setProps({
        preferredOptionLabel: preferredLabel,
      });
    });
    // assert the state and do changes.
    let dataModelling = wrapper.find(DataModelling);
    const schemaSelect = wrapper.find(SchemaSelect);
    const select = schemaSelect.find('Select');
    let schemaEditor = dataModelling.find('SchemaEditorApp');
    expect(schemaEditor.props().name).toBe(modelName2);
    const options = select.props().options;
    act(() => {
      select.props().onChange(options[0]); // change the selection to invoke possible calls to clear
    });
    wrapper.update(); // update selectors
    dataModelling = wrapper.find(DataModelling);
    schemaEditor = dataModelling.find('SchemaEditorApp');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(schemaEditor.props().name).toBe(modelName);
  });

  it('dispatches correctly when running createAction', () => {
    act(() => {
      wrapper = mountComponent();
    });
    expect(wrapper.find('input').length).toBe(1); // dropdown selector
    wrapper.update();
    const createNew = wrapper.find('CreateNewWrapper');
    act(() => {
      createNew.props().createAction('test');
    });
    wrapper.update();
    expect(store.dispatch).toHaveBeenCalledTimes(2);
    expect(store.dispatch).toHaveBeenCalledWith(
      {
        type: 'dataModelling/createNewDataModel',
        payload: {
          modelName: 'test',
        },
      },
    );
  });

  it('dispatches correctly when delete is called', () => {
    act(() => {
      wrapper = mountComponent();
    });
    wrapper.update();
    const deleteWrapper = wrapper.find('DeleteWrapper');
    act(() => {
      deleteWrapper.props().deleteAction();
    });
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'dataModelling/deleteDataModel',
      payload: initialStoreCall.payload,
    });
  });
});
