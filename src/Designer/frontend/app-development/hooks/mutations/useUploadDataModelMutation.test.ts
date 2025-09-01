import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useUploadDataModelMutation } from './useUploadDataModelMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import Mock = jest.Mock;

// Test data:
const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });

const renderHook = async ({
  queryClient,
  modelPath,
}: {
  queryClient?: QueryClient;
  modelPath?: string;
} = {}) => {
  const uploadDataModelResult = renderHookWithProviders(
    {},
    queryClient,
  )(() => useUploadDataModelMutation(modelPath)).renderHookResult.result;
  await waitFor(() => uploadDataModelResult.current.mutate(file));
  expect(uploadDataModelResult.current.isSuccess).toBe(true);
};

describe('useUploadDataModelMutation', () => {
  it('calls uploadDataModel with correct arguments and payload', async () => {
    await renderHook();

    expect(queriesMock.uploadDataModel).toHaveBeenCalledTimes(1);
    const parameters = (queriesMock.uploadDataModel as Mock).mock.calls[0];
    const [orgParam, appParam, formDataParam] = parameters;
    expect(orgParam).toBe(org);
    expect(appParam).toBe(app);
    expect(formDataParam).toBeInstanceOf(FormData);
    expect(formDataParam.get('file')).toBe(file);
  });

  it('invalidates metadata queries when upload is successful', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(4);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DataModelsJson, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DataModelsXsd, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadataModelIds, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadata, org, app],
    });
  });

  it('invalidates json schema metadata when upload is successful and a modelPath is provided', async () => {
    const queryClient = createQueryClientMock();
    const mockModelPath = '/App/models/mockModel.schema.json';
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook({ queryClient, modelPath: mockModelPath });

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(5);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.JsonSchema, org, app, mockModelPath],
    });
  });
});
