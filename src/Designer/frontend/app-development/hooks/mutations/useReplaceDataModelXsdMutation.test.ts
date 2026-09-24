import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useReplaceDataModelXsdMutation } from './useReplaceDataModelXsdMutation';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import Mock = jest.Mock;

// Test data:
const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
const modelPath = 'App/models/mockModel.schema.json';

const renderHook = async (queryClient?: QueryClient) => {
  const replaceDataModelResult = renderHookWithProviders(
    {},
    queryClient,
  )(() => useReplaceDataModelXsdMutation(modelPath)).renderHookResult.result;
  await waitFor(() => replaceDataModelResult.current.mutate(file));
  expect(replaceDataModelResult.current.isSuccess).toBe(true);
};

describe('useReplaceDataModelXsdMutation', () => {
  it('calls replaceDataModelXsd with the selected model path and the uploaded file', async () => {
    await renderHook();

    expect(queriesMock.replaceDataModelXsd).toHaveBeenCalledTimes(1);
    const [orgParam, appParam, modelPathParam, formDataParam] = (
      queriesMock.replaceDataModelXsd as Mock
    ).mock.calls[0];
    expect(orgParam).toBe(org);
    expect(appParam).toBe(app);
    expect(modelPathParam).toBe(modelPath);
    expect(formDataParam).toBeInstanceOf(FormData);
    expect(formDataParam.get('file')).toBe(file);
  });

  it('invalidates the model queries when the replacement is successful', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook(queryClient);

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(6);
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
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.JsonSchema, org, app, modelPath],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.DataModelGenerationStatus, org, app, modelPath],
    });
  });
});
