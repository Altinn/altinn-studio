/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import * as ReactRouter from 'react-router';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import StandaloneDataModelling from '../../../features/standaloneDataModelling/DataModelling';
import { LoadingState } from '../../../../shared/features/dataModelling/sagas/metadata';

describe('Dashboard > StandaloneDataModelling', () => {
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
      loadState: LoadingState.ModelsLoaded,
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
    jest.spyOn(ReactRouter, 'useParams').mockReturnValue({
      org: 'test-org',
      repoName: 'test-repo',
    });

    store = configureStore()({ ...initialState, language: { language } });
    store.dispatch = jest.fn(dispatchMock);
  });

  const mountComponent = () =>
    mount(
      <Provider store={store}>
        <StandaloneDataModelling language={language} />
      </Provider>,
      { context: { store } },
    );

  it('should fetch models on mount', () => {
    act(() => {
      mountComponent();
    });

    expect(store.dispatch).toHaveBeenCalledWith(initialStoreCall);
  });
});
