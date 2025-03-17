import { waitFor } from '@testing-library/react';
import { useDataModelsJsonQuery } from 'app-shared/hooks/queries/useDataModelsJsonQuery';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

// Test data
const appRepoName = app;
const dataModelRepoName = `${org}-datamodels`;
const dataModels: DataModelMetadataJson[] = [jsonMetadataMock];
const getAppDataModelsJson = jest.fn(() => Promise.resolve(dataModels));
const getOrgDataModelsJson = jest.fn(() => Promise.resolve(dataModels));

describe('useDataModelsJsonQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getAppDataModelsJson with correct arguments and returns the data, when the repo is not a data model repo', async () => {
    const result = renderHookWithProviders(() => useDataModelsJsonQuery(org, appRepoName), {
      queries: { getAppDataModelsJson, getOrgDataModelsJson },
    }).result;

    await waitFor(() => result.current.isPending);
    await waitFor(() => result.current.isSuccess);
    expect(getAppDataModelsJson).toHaveBeenCalledWith(org, appRepoName);
    expect(getOrgDataModelsJson).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(dataModels);
  });

  it('Calls getOrgDataModelsJson with correct arguments and returns the data, when the repo is a data model repo', async () => {
    const result = renderHookWithProviders(() => useDataModelsJsonQuery(org, dataModelRepoName), {
      queries: { getAppDataModelsJson, getOrgDataModelsJson },
    }).result;

    await waitFor(() => result.current.isPending);
    await waitFor(() => result.current.isSuccess);
    expect(getOrgDataModelsJson).toHaveBeenCalledWith(org, dataModelRepoName);
    expect(getAppDataModelsJson).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(dataModels);
  });
});
