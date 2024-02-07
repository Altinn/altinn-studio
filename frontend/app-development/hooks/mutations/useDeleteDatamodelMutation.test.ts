import { renderHookWithMockStore } from '../../test/mocks';
import { useDeleteDatamodelMutation } from './useDeleteDatamodelMutation';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createJsonModelPathMock } from 'app-shared/mocks/modelPathMocks';
import {
  createJsonMetadataMock,
  createXsdMetadataMock,
} from 'app-shared/mocks/datamodelMetadataMocks';

const modelName = 'modelName';
const modelPath = createJsonModelPathMock(modelName);
const org = 'org';
const app = 'app';
const modelMetadataJson = createJsonMetadataMock(modelName);
const modelMetadataXsd = createXsdMetadataMock(modelName);

describe('useDeleteDatamodelMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls deleteDatamodel with correct parameters', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DatamodelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DatamodelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    expect(result.current).toBeDefined();
    result.current.mutate(modelPath);
    await waitFor(() => result.current.isSuccess);
    expect(queriesMock.deleteDatamodel).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteDatamodel).toHaveBeenCalledWith(org, app, modelPath);
  });

  it('Removes the metadata instances from the query cache', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DatamodelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DatamodelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelPath);
    await waitFor(() => result.current.isSuccess);
    expect(client.getQueryData([QueryKey.DatamodelsJson, org, app])).toEqual([]);
    expect(client.getQueryData([QueryKey.DatamodelsXsd, org, app])).toEqual([]);
  });

  it('Removes the schema queries from the query cache', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.DatamodelsJson, org, app], [modelMetadataJson]);
    client.setQueryData([QueryKey.DatamodelsXsd, org, app], [modelMetadataXsd]);
    const {
      renderHookResult: { result },
    } = render({}, client);
    result.current.mutate(modelPath);
    await waitFor(() => result.current.isSuccess);
    expect(client.getQueryData([QueryKey.JsonSchema, org, app, modelPath])).toBeUndefined();
    expect(
      client.getQueryData([QueryKey.JsonSchema, org, app, modelMetadataXsd.repositoryRelativeUrl]),
    ).toBeUndefined();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderHookWithMockStore({}, queries, queryClient)(() => useDeleteDatamodelMutation());
