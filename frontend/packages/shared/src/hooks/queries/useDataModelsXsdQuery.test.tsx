import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries/useDataModelsXsdQuery';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { xsdMetadataMock } from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';

describe('useDataModelsXsdQuery', () => {
  it('Calls getDataModelsXsd with correct arguments and returns the data', async () => {
    const dataModels: DataModelMetadataXsd[] = [xsdMetadataMock];
    const getDataModelsXsd = jest.fn().mockImplementation(() => Promise.resolve(dataModels));
    const client = createQueryClientMock();

    const { result } = renderHook(() => useDataModelsXsdQuery(org, app), {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...{
            ...queriesMock,
            getDataModelsXsd,
            client,
          }}
        >
          {children}
        </ServicesContextProvider>
      ),
    });

    await waitFor(() => result.current.isPending);
    expect(getDataModelsXsd).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(dataModels);
  });
});
