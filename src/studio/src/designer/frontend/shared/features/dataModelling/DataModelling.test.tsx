import React from 'react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import DataModelling, { shouldSelectFirstEntry } from './DataModelling';
import { LoadingState } from './sagas/metadata';
import { render as rtlRender } from '@testing-library/react';

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
    loadState: LoadingState.ModelsLoaded,
  },
  dataModelling: {
    schema: {},
    saving: false,
  },
};
const initialStoreCall = {
  type: 'dataModelling/fetchDataModel',
  payload: {
    metadata: {
      label: modelName,
      value: initialState.dataModelsMetadataState.dataModelsMetadata[0],
    },
  },
};

describe('DataModelling', () => {
  it('should fetch models on mount', () => {
    const { store } = render();

    expect(store.dispatch).toHaveBeenCalledWith(initialStoreCall);
  });

  describe('shouldSelectFirstEntry', () => {
    it('should return true when metadataOptions.length is greater than 0, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [
            {
              label: 'option 1',
              value: {
                repositoryRelativeUrl: '',
                fileName: 'option 1.xsd',
              },
            },
          ],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
      ).toBe(true);
    });

    it('should return false when metadataOptions.length is greater than 0, selectedOption is set and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [
            {
              label: 'option 1',
              value: {
                repositoryRelativeUrl: '',
                fileName: 'option 1.xsd',
              },
            },
          ],
          selectedOption: {
            label: 'some-label',
          },
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
      ).toBe(false);
    });

    it('should return false when metadataOptions.length is greater than 0, selectedOption is undefined and metadataLoadingState is not ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [
            {
              label: 'option 1',
              value: {
                repositoryRelativeUrl: '',
                fileName: 'option 1.xsd',
              },
            },
          ],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.LoadingModels,
        }),
      ).toBe(false);
    });

    it('should return false when metadataOptions not set, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
      ).toBe(false);
    });

    it('should return false when metadataOptions is 0, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
      ).toBe(false);
    });
  });
});

const render = () => {
  const store = configureStore()(initialState);
  store.dispatch = jest.fn();

  rtlRender(
    <Provider store={store}>
      <DataModelling
        language={{
          administration: {
            first: 'some text',
            second: 'other text',
          },
        }}
        org='test-org'
        repo='test-repo'
      />
    </Provider>,
  );

  return { store };
};
