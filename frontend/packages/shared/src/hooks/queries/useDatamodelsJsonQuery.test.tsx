import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useDatamodelsJsonQuery } from 'app-shared/hooks/queries/useDatamodelsJsonQuery';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { DatamodelMetadataJson } from 'app-shared/types/DatamodelMetadata';
import { jsonMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';

// Test data:
const org = 'org';
const app = 'app';

describe('useDatamodelsJsonQuery', () => {
  it('Calls getDatamodels with correct arguments and returns the data', async () => {
    const datamodels: DatamodelMetadataJson[] = [jsonMetadataMock];
    const getDatamodelsJson = jest.fn().mockImplementation(() => Promise.resolve(datamodels));
    const client = createQueryClientMock();

    const { result } = renderHook(() => useDatamodelsJsonQuery(org, app), {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...{
            ...queriesMock,
            getDatamodelsJson,
            client,
          }}
        >
          {children}
        </ServicesContextProvider>
      ),
    });

    await waitFor(() => result.current.isPending);
    expect(getDatamodelsJson).toHaveBeenCalledWith(org, app);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(datamodels);
  });
});
