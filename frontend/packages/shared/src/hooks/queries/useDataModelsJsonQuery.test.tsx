import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useDataModelsJsonQuery } from 'app-shared/hooks/queries/useDataModelsJsonQuery';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';

describe('useDataModelsJsonQuery', () => {
  it('Calls getDataModels with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataJson[] = [jsonMetadataMock];
    const getDataModelsJson = jest.fn().mockImplementation(() => Promise.resolve(dataModels));
    const client = createQueryClientMock();

    const { result } = renderHook(() => useDataModelsJsonQuery(org, app), {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...{
            ...queriesMock,
            getDataModelsJson,
            client,
          }}
        >
          {children}
        </ServicesContextProvider>
      ),
    });

    await waitFor(() => result.current.isPending);
    expect(getDataModelsJson).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
