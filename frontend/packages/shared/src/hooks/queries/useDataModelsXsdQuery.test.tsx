import { waitFor } from '@testing-library/react';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries/useDataModelsXsdQuery';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { xsdMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

// Test data
const appRepoName = app;
const dataModelRepoName = `${org}-datamodels`;
const dataModels: DataModelMetadataXsd[] = [xsdMetadataMock];
const getAppDataModelsXsd = jest.fn(() => Promise.resolve(dataModels));
const getOrgDataModelsXsd = jest.fn(() => Promise.resolve(dataModels));

describe('useDataModelsXsdQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getAppDataModelsXsd with correct arguments and returns the data, when the repo is an app repo', async () => {
    const result = renderHookWithProviders(() => useDataModelsXsdQuery(org, appRepoName), {
      queries: { getAppDataModelsXsd, getOrgDataModelsXsd },
    }).result;

    await waitFor(() => result.current.isPending);
    await waitFor(() => result.current.isSuccess);
    expect(getAppDataModelsXsd).toHaveBeenCalledWith(org, appRepoName);
    expect(getOrgDataModelsXsd).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(dataModels);
  });

  it('Calls getOrgDataModelsXsd with correct arguments and returns the data, when the repo is a data model repo', async () => {
    const result = renderHookWithProviders(() => useDataModelsXsdQuery(org, dataModelRepoName), {
      queries: { getAppDataModelsXsd, getOrgDataModelsXsd },
    }).result;

    await waitFor(() => result.current.isPending);
    await waitFor(() => result.current.isSuccess);
    expect(getOrgDataModelsXsd).toHaveBeenCalledWith(org, dataModelRepoName);
    expect(getAppDataModelsXsd).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(dataModels);
  });
});
