import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useUpdateProcessDataTypesMutation } from './useUpdateProcessDataTypesMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import type { DataTypesChange } from 'app-shared/types/api/DataTypesChange';

// Test data
const newDataTypes = ['data-model'];
const connectedTaskId = 'Task_1';
const metadata: DataTypesChange = {
  newDataTypes,
  connectedTaskId,
};

const renderHook = async ({
  queryClient,
}: {
  queryClient?: QueryClient;
} = {}) => {
  const updateProcessDataTypesResult = renderHookWithProviders(
    {},
    queryClient,
  )(() => useUpdateProcessDataTypesMutation(org, app)).renderHookResult.result;
  await waitFor(() => updateProcessDataTypesResult.current.mutateAsync(metadata));
  expect(updateProcessDataTypesResult.current.isSuccess).toBe(true);
};

describe('useUpdateProcessDataTypeMutation', () => {
  it('calls updateProcessDataTypes with correct arguments and payload', async () => {
    await renderHook();

    expect(queriesMock.updateProcessDataTypes).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateProcessDataTypes).toHaveBeenCalledWith(org, app, metadata);
  });

  it('invalidates metadata queries when update is successful', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadataModelIds, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.LayoutSets, org, app],
    });
  });
});
