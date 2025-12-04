import { waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useSharedCodeListsQuery } from './useSharedCodeListsQuery';
import type { GetSharedResourcesResponse } from 'app-shared/types/api/GetSharedResourcesResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'test-org';
const path = 'CodeLists';
const getSharedResourcesResponse: GetSharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/list1.json',
      contentType: 'application/json',
      content: '{"key": "value"}',
    },
  ],
  commitSha: '38c90d8e9dbe63e69ce071532efc01bc0e3ed81a',
};
const getSharedResourcesByPath = jest.fn().mockResolvedValue(getSharedResourcesResponse);

describe('useSharedCodeListsQuery', () => {
  afterEach(getSharedResourcesByPath.mockClear);

  it('Calls getSharedResourcesByPath with the correct parameters', () => {
    renderUseSharedCodeListsQuery();
    expect(getSharedResourcesByPath).toHaveBeenCalledWith(orgName, path);
  });

  it('Calls getSharedResourcesByPath with custom path', () => {
    const customPath = 'CustomPath';
    renderUseSharedCodeListsQuery(createQueryClientMock(), customPath);
    expect(getSharedResourcesByPath).toHaveBeenCalledWith(orgName, customPath);
  });

  it('Populates the cache with correct keys', async () => {
    const client = createQueryClientMock();
    const { result } = renderUseSharedCodeListsQuery(client);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([QueryKey.GetSharedResourcesByPath, orgName, path])).toEqual(
      getSharedResourcesResponse,
    );
  });

  it('Returns the correct data from the cache', () => {
    const client = createQueryClientMock();
    client.setQueryData(
      [QueryKey.GetSharedResourcesByPath, orgName, path],
      getSharedResourcesResponse,
    );
    const { result } = renderUseSharedCodeListsQuery(client);
    expect(result.current.data).toEqual(getSharedResourcesResponse);
  });
});

function renderUseSharedCodeListsQuery(
  queryClient: QueryClient = createQueryClientMock(),
  customPath?: string,
): RenderHookResult<UseQueryResult<GetSharedResourcesResponse>, void> {
  return renderHookWithProviders(() => useSharedCodeListsQuery(orgName, customPath), {
    queries: { getSharedResourcesByPath },
    queryClient,
  });
}
