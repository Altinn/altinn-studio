import { waitFor } from '@testing-library/react';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries/useDataModelsXsdQuery';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { xsdMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

describe('useDataModelsXsdQuery', () => {
  it('Calls getDataModelsXsd with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataXsd[] = [xsdMetadataMock];
    const getDataModelsXsd = jest.fn().mockImplementation(() => Promise.resolve(dataModels));

    const result = renderHookWithProviders(() => useDataModelsXsdQuery(org, app), {
      queries: { getDataModelsXsd },
    }).result;

    await waitFor(() => result.current.isPending);
    expect(getDataModelsXsd).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
