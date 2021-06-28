/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import DataModellingContainer from '../../features/dataModelling/containers/DataModellingContainer';
import * as testData from '../__testdata__/schemaTestData.json';

describe('DataModelling', () => {
  const language = { administration: {} };
  const initialState = {
    repoMetadataState: {
      applicationMetadata: {
        dataTypes: [
          {
            id: 'ref-data-as-pdf',
            allowedContentTypes: [
              'application/pdf',
            ],
            maxCount: 0,
            minCount: 0,
          },
          {
            id: 'some-existing-model',
            appLogic: {},
          },
        ],
      },
    },
    dataModelling: {
      schema: testData,
      modelName: 'testing',
      saving: false,
    },
  };
  let store: any;
  let repoType: any;
  const dispatchMock = () => Promise.resolve({});
  const modelName = 'some-existing-model';
  const initialStoreCall = {
    type: 'dataModelling/fetchDataModel',
    payload: {
      repoType,
      metadata: {
        label: modelName,
        value: {
          id: modelName,
          appLogic: {},
        },
      },
    },
  };

  beforeEach(() => {
    store = configureStore()(initialState);
    store.dispatch = jest.fn(dispatchMock);
  });
  const mountComponent = () => mount(
    <Provider store={store}>
      <DataModellingContainer language={language} />
    </Provider>,
    { context: { store } },
  );
  it('fetches model on mount', () => {
    act(() => {
      mountComponent();
    });
    expect(store.dispatch).toHaveBeenCalledWith(initialStoreCall);
  });

  it('dispatches correctly when clicking new', () => {
    let wrapper: any = null;
    act(() => {
      wrapper = mountComponent();
    });
    const newButton = wrapper.find('button#new-button');
    expect(wrapper.find('input').length).toBe(1);
    newButton.at(0).simulate('click');
    const inputField = wrapper.find('div#newModelInput').find('input');
    expect(inputField).toBeTruthy();
    inputField.simulate('change', { target: { value: 'test' } });
    wrapper.update();
    const okButton = wrapper.find('#newModelInput').find('button');
    expect(okButton).toBeTruthy();
    expect(okButton.length).toBe(1);
    okButton.simulate('click');
    wrapper.update();

    expect(store.dispatch).toHaveBeenCalledTimes(2);
    expect(store.dispatch).toHaveBeenCalledWith(
      {
        type: 'dataModelling/createNewDataModel',
        payload: {
          modelName: 'test',
          onNewNameCreated: expect.any(Function),
        },
      },
    );
  });

  it('checks for existing model name', () => {
    let wrapper: any = null;
    act(() => {
      wrapper = mountComponent();
    });
    wrapper.find('#new-button').at(0).simulate('click');
    wrapper.find('#newModelInput').find('input').hostNodes().at(0)
      .simulate('change', { target: { value: 'some-existing-model' } });
    wrapper.find('#newModelInput').find('button').simulate('click');

    expect(store.dispatch).not.toHaveBeenCalledWith({
      type: 'dataModelling/createNewDataModel',
      payload: {
        modelName: 'some-existing-model',
      },
    });
  });

  it('dispatches correctly when clicking delete', () => {
    let wrapper: any = null;
    act(() => {
      wrapper = mountComponent();
    });
    expect(wrapper).not.toBeNull();

    wrapper.find('#delete-button').at(0).simulate('click');
    wrapper.find('#confirm-delete-button').at(0).simulate('click');

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'dataModelling/deleteDataModel',
      payload: initialStoreCall.payload,
    });
  });

  it('does not dispatch create when name is missing', () => {
    let wrapper: any = null;
    act(() => {
      wrapper = mountComponent();
    });
    expect(wrapper).not.toBeNull();
    wrapper.find('#new-button').at(0).simulate('click');

    wrapper.find('#newModelInput').find('button').simulate('click');
    expect(store.dispatch).not.toHaveBeenCalledWith({
      type: 'dataModelling/createNewDataModel',
    });
  });
});
