import { waitFor } from '@testing-library/react';
import { useAppDataModelsJsonQuery } from 'app-shared/hooks/queries/useAppDataModelsJsonQuery';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

describe('useAppDataModelsJsonQuery', () => {
  it('Calls getAppDataModels with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataJson[] = [jsonMetadataMock];
    const getAppDataModelsJson = jest.fn().mockImplementation(() => Promise.resolve(dataModels));

    const result = renderHookWithProviders(() => useAppDataModelsJsonQuery(org, app), {
      queries: { getAppDataModelsJson },
    }).result;

    await waitFor(() => result.current.isPending);
    expect(getAppDataModelsJson).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
