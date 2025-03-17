import { waitFor } from '@testing-library/react';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { xsdMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useOrgDataModelsXsdQuery } from 'app-shared/hooks/queries/useOrgDataModelsXsdQuery';

describe('useOrgDataModelsXsdQuery', () => {
  it('Calls getAppDataModelsXsd with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataXsd[] = [xsdMetadataMock];
    const getOrgDataModelsXsd = jest.fn().mockImplementation(() => Promise.resolve(dataModels));

    const result = renderHookWithProviders(() => useOrgDataModelsXsdQuery(org, app), {
      queries: { getOrgDataModelsXsd },
    }).result;

    await waitFor(() => result.current.isPending);
    expect(getOrgDataModelsXsd).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
