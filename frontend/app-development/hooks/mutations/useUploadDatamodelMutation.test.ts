import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { useUploadDatamodelMutation } from './useUploadDatamodelMutation';
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
  const uploadDatamodelResult = renderHookWithMockStore(
    {},
    {},
    queryClient,
  )(() => useUploadDatamodelMutation()).renderHookResult.result;
  await waitFor(() => uploadDatamodelResult.current.mutate(file));
  expect(uploadDatamodelResult.current.isSuccess).toBe(true);
};

describe('useUploadDatamodelMutation', () => {
  it('calls uploadDatamodel with correct arguments and payload', async () => {
    await renderHook();

    expect(queriesMock.uploadDatamodel).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadDatamodel).toHaveBeenCalledWith(org, app, file);
  });

  it('invalidates metadata queries when upload is successful', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DatamodelsJson, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DatamodelsXsd, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadataModelIds, org, app],
    });
  });
});
