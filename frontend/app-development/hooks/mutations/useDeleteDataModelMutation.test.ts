import { renderHookWithProviders } from '../../test/mocks';
import { useDeleteDataModelMutation } from './useDeleteDataModelMutation';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createJsonModelPathMock, createXsdModelPathMock } from 'app-shared/mocks/modelPathMocks';
import {
  createJsonMetadataMock,
  createXsdMetadataMock,
} from 'app-shared/mocks/dataModelMetadataMocks';
import { app, org } from '@studio/testing/testids';

const modelName = 'modelName';
const modelJsonPath = createJsonModelPathMock(modelName);
const modelXsdPath = createXsdModelPathMock(modelName);
const modelMetadataJson = createJsonMetadataMock(modelName);
const modelMetadataXsd = createXsdMetadataMock(modelName);

describe('useDeleteDataModelMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls deleteDataModel with correct parameters', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DataModelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DataModelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    expect(result.current).toBeDefined();
    result.current.mutate(modelJsonPath);
    await waitFor(() => result.current.isSuccess);
    expect(queriesMock.deleteDataModel).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteDataModel).toHaveBeenCalledWith(org, app, modelJsonPath);
  });

  it('Removes the metadata instances from the query cache when model is json', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DataModelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DataModelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelJsonPath);
    await waitFor(() => result.current.isSuccess);
    expect(client.getQueryData([QueryKey.DataModelsJson, org, app])).toEqual([]);
    expect(client.getQueryData([QueryKey.DataModelsXsd, org, app])).toEqual([]);
  });

  it('Removes the metadata instances from the query cache when model is xsd', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DataModelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DataModelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelXsdPath);
    await waitFor(() => result.current.isSuccess);
    expect(client.getQueryData([QueryKey.DataModelsJson, org, app])).toEqual([]);
    expect(client.getQueryData([QueryKey.DataModelsXsd, org, app])).toEqual([]);
  });

  it('Removes the schema queries from the query cache when model is json', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DataModelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DataModelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelJsonPath);
    await waitFor(() => result.current.isSuccess);
    expect(client.getQueryData([QueryKey.JsonSchema, org, app, modelJsonPath])).toBeUndefined();
    expect(client.getQueryData([QueryKey.JsonSchema, org, app, modelXsdPath])).toBeUndefined();
  });

  it('Removes the schema queries from the query cache when model is xsd', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DataModelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DataModelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelXsdPath);
    await waitFor(() => result.current.isSuccess);
    expect(client.getQueryData([QueryKey.JsonSchema, org, app, modelJsonPath])).toBeUndefined();
    expect(client.getQueryData([QueryKey.JsonSchema, org, app, modelXsdPath])).toBeUndefined();
  });

  it('Invalidates the appMetadataModelIds and appMetadata from the cache', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    client.setQueryData([QueryKey.DataModelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DataModelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelJsonPath);
    await waitFor(() => result.current.isSuccess);
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadataModelIds, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppMetadata, org, app],
    });
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderHookWithProviders(queries, queryClient)(() => useDeleteDataModelMutation());
