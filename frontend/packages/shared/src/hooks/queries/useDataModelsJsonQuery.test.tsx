import { waitFor } from '@testing-library/react';
import { useDataModelsJsonQuery } from 'app-shared/hooks/queries/useDataModelsJsonQuery';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

describe('useDataModelsJsonQuery', () => {
  it('Calls getDataModels with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataJson[] = [jsonMetadataMock];
    const getDataModelsJson = jest.fn().mockImplementation(() => Promise.resolve(dataModels));

    const result = renderHookWithProviders(() => useDataModelsJsonQuery(org, app), {
      queries: { getDataModelsJson },
    }).result;

    await waitFor(() => result.current.isPending);
    expect(getDataModelsJson).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
