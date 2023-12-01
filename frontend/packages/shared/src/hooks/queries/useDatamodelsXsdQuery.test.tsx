import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useDatamodelsXsdQuery } from 'app-shared/hooks/queries/useDatamodelsXsdQuery';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { DatamodelMetadataXsd } from 'app-shared/types/DatamodelMetadata';
import { xsdMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';

// Test data:
const org = 'org';
const app = 'app';

describe('useDatamodelsXsdQuery', () => {
  it('Calls getDatamodelsXsd with correct arguments and returns the data', async () => {
    const datamodels: DatamodelMetadataXsd[] = [xsdMetadataMock];
    const getDatamodelsXsd = jest.fn().mockImplementation(() => Promise.resolve(datamodels));
    const client = createQueryClientMock();

    const { result } = renderHook(() => useDatamodelsXsdQuery(org, app), {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...{
            ...queriesMock,
            getDatamodelsXsd,
            client,
          }}
        >
          {children}
        </ServicesContextProvider>
      ),
    });

    await waitFor(() => result.current.isPending);
    expect(getDatamodelsXsd).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(datamodels);
  });
});
