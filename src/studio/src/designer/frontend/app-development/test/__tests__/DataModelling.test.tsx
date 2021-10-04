/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import DataModellingContainer from '../../features/dataModelling/containers/DataModellingContainer';
// @ts-ignore -- seems works, but editors complain
import * as testData from '../__testdata__/schemaTestData.json';

describe('DataModelling', () => {
  const language = { administration: {} };
  const modelName = 'some-existing-model';
  const initialState = {
    dataModelsMetadataState: {
      dataModelsMetadata: [
        {
          repositoryRelativeUrl: `/App/models/${modelName}.schema.json`,
          fileName: `${modelName}.schema.json`,
          fileType: '.json',
        },
      ],
    },
    dataModelling: {
      schema: testData,
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
});
