import { waitFor } from '@testing-library/react';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useOrgDataModelsJsonQuery } from 'app-shared/hooks/queries/useOrgDataModelsJsonQuery';

describe('useOrgDataModelsJsonQuery', () => {
  it('Calls getAppDataModels with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataJson[] = [jsonMetadataMock];
    const getOrgDataModelsJson = jest.fn().mockImplementation(() => Promise.resolve(dataModels));

    const result = renderHookWithProviders(() => useOrgDataModelsJsonQuery(org, app), {
      queries: { getOrgDataModelsJson },
    }).result;

    await waitFor(() => result.current.isPending);
    expect(getOrgDataModelsJson).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
