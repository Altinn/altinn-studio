import React from 'react';
import {Route, Routes, Navigate} from 'react-router-dom';
import DataModelling from './DataModelling';
import {LoadingState} from 'app-shared/features/dataModelling/sagas/metadata';

import {renderWithProviders} from "test/testUtils";
import {setupStore} from "app/store";

describe('DataModelling', () => {
  const language = {administration: {}};
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
      useParams: jest.fn().mockReturnValue({org: 'test-org', repoName: 'test-repo'}),
    }));
    const initStore = setupStore({ ...initialState, language: { language } } as unknown);
    const dispatch = jest.spyOn(initStore, 'dispatch').mockImplementation(jest.fn());
    renderWithProviders(
      <Routes>
        <Route path="/" element={<Navigate to={"/org/repo"} replace/>}/>
        <Route path="/:org/:repoName" element={
          <DataModelling language={language}/>}/>
      </Routes>
      , {
        store: initStore
      }
    );
    expect(dispatch).toHaveBeenCalledWith(initialStoreCall);
  });
});
