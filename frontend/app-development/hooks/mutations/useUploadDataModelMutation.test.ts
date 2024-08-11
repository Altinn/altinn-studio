import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useUploadDataModelMutation } from './useUploadDataModelMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';

// Test data:
const formData = new FormData();
formData.append('hello', new File(['hello'], 'hello.xsd', { type: 'text/xml' }));

const renderHook = async ({
  queryClient,
  modelPath,
}: {
  queryClient?: QueryClient;
  modelPath?: string;
} = {}) => {
  const uploadDataModelResult = renderHookWithProviders(
    () => useUploadDataModelMutation(modelPath),
    {
      queryClient,
    },
  ).result;
  await waitFor(() => uploadDataModelResult.current.mutate(formData));
  expect(uploadDataModelResult.current.isSuccess).toBe(true);
};

describe('useUploadDataModelMutation', () => {
  it('calls uploadDataModel with correct arguments and payload', async () => {
    await renderHook();

    expect(queriesMock.uploadDataModel).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadDataModel).toHaveBeenCalledWith(org, app, formData);
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

  it('invalidates json schema metadata when upload is successful and a modelPath is provided', async () => {
    const queryClient = createQueryClientMock();
    const mockModelPath = '/App/models/mockModel.schema.json';
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient, modelPath: mockModelPath });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(4);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.JsonSchema, org, app, mockModelPath],
    });
  });
});
