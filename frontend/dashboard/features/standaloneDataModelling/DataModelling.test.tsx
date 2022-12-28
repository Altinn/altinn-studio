import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DataModellingContainer } from './DataModelling';
import { LoadingState } from 'app-shared/features/dataModelling/sagas/metadata';
import { renderWithProviders } from '../../dashboardTestUtils';
import { setupStore } from '../../app/store';

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('DataModelling', () => {
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

  const initialStoreCall = {
    type: 'dataModelling/fetchDataModel',
    payload: {
      metadata: {
        label: modelName,
        value: initialState.dataModelsMetadataState.dataModelsMetadata[0],
      },
    },
  };

  it('should fetch models on mount', () => {
    jest.mock('react-router', () => ({
      useParams: jest.fn().mockReturnValue({ org: 'test-org', repoName: 'test-repo' }),
    }));
    const initStore = setupStore({
      ...initialState,
      language: { language },
    } as unknown);
    const dispatch = jest.spyOn(initStore, 'dispatch').mockImplementation(jest.fn());
    renderWithProviders(
      <Routes>
        <Route path='/' element={<Navigate to={'/org/repo'} replace />} />
        <Route path='/:org/:repoName' element={<DataModellingContainer />} />
      </Routes>,
      {
        store: initStore,
      }
    );
    expect(dispatch).toHaveBeenCalledWith(initialStoreCall);
  });
});
