import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useUploadDataModelMutation } from './useUploadDataModelMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';

// Test data:
const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });

const renderHook = async ({
  queryClient,
}: {
  queryClient?: QueryClient;
} = {}) => {
  const uploadDataModelResult = renderHookWithProviders(
    {},
    queryClient,
  )(() => useUploadDataModelMutation()).renderHookResult.result;
  await waitFor(() => uploadDataModelResult.current.mutate(file));
  expect(uploadDataModelResult.current.isSuccess).toBe(true);
};

describe('useUploadDataModelMutation', () => {
  it('calls uploadDataModel with correct arguments and payload', async () => {
    await renderHook();

    expect(queriesMock.uploadDataModel).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadDataModel).toHaveBeenCalledWith(org, app, file);
  });

  it('invalidates metadata queries when upload is successful', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DataModelsJson, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DataModelsXsd, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadataModelIds, org, app],
    });
  });
});
