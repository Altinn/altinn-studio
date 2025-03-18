import { waitFor } from '@testing-library/react';
import { useAppDataModelsXsdQuery } from 'app-shared/hooks/queries/useAppDataModelsXsdQuery';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { xsdMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

describe('useAppDataModelsXsdQuery', () => {
  it('Calls getAppDataModelsXsd with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataXsd[] = [xsdMetadataMock];
    const getAppDataModelsXsd = jest.fn(() => Promise.resolve(dataModels));

    const result = renderHookWithProviders(() => useAppDataModelsXsdQuery(org, app), {
      queries: { getAppDataModelsXsd },
    }).result;

    await waitFor(() => result.current.isSuccess);
    expect(getAppDataModelsXsd).toHaveBeenCalledWith(org, app);
    expect(result.current.data).toEqual(dataModels);
  });
});
