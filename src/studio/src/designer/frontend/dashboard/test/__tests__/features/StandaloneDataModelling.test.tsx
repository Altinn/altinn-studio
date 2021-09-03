/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import StandaloneDataModelling from '../../../features/standaloneDataModelling/DataModelling';

describe('StandaloneDataModelling', () => {
  const language = { administration: {} };
  const modelName = 'model-name';
  const initialState = {
    dataModelsMetadataState: {
      dataModelsMetadata: [
        {
          repositoryRelativeUrl: `/path/to/models/${modelName}.schema.json`,
          fileName: `${modelName}.schema.json`,
          fileType: '.json',
        },
      ],
    },
    dataModelling: {
      schema: {},
      saving: false,
    },
  };

  let store: any;
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

  beforeEach(() => {
    store = configureStore()({ ...initialState, language: { language } });
    store.dispatch = jest.fn(dispatchMock);
  });
  const mountComponent = () => mount(
    <Provider store={store}>
      <StandaloneDataModelling language={language} />
    </Provider>,
    { context: { store } },
  );
  it('fetches model on mount', () => {
    act(() => {
      mountComponent();
    });
    expect(store.dispatch)
      .toHaveBeenCalledTimes(2);
    expect(store.dispatch)
      .toHaveBeenCalledWith(initialStoreCall);
  });
});
