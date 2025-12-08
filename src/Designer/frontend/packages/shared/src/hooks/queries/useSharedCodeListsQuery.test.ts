import { waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useSharedCodeListsQuery } from './useSharedCodeListsQuery';
import type { SharedResourcesResponse } from 'app-shared/types/api/GetSharedResourcesResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'test-org';
const path = 'CodeLists';
const getSharedResourcesResponse: SharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/list1.json',
      contentType: 'application/json',
      content: '{"key": "value"}',
    },
  ],
  commitSha: '38c90d8e9dbe63e69ce071532efc01bc0e3ed81a',
};
const getSharedResources = jest.fn().mockResolvedValue(getSharedResourcesResponse);

describe('useSharedCodeListsQuery', () => {
  afterEach(getSharedResources.mockClear);

  it('Calls getSharedResources with the correct parameters', () => {
    renderUseSharedCodeListsQuery();
    expect(getSharedResources).toHaveBeenCalledWith(orgName, path);
  });

  it('Calls getSharedResources with custom path', () => {
    const customPath = 'CustomPath';
    renderUseSharedCodeListsQuery(createQueryClientMock(), customPath);
    expect(getSharedResources).toHaveBeenCalledWith(orgName, customPath);
  });

  it('Populates the cache with correct keys', async () => {
    const client = createQueryClientMock();
    const { result } = renderUseSharedCodeListsQuery(client);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([QueryKey.SharedResources, orgName, path])).toEqual(
      getSharedResourcesResponse,
    );
  });

  it('Returns the correct data from the cache', () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.SharedResources, orgName, path], getSharedResourcesResponse);
    const { result } = renderUseSharedCodeListsQuery(client);
    expect(result.current.data).toEqual(getSharedResourcesResponse);
  });
});

function renderUseSharedCodeListsQuery(
  queryClient: QueryClient = createQueryClientMock(),
  customPath?: string,
): RenderHookResult<UseQueryResult<SharedResourcesResponse>, void> {
  return renderHookWithProviders(() => useSharedCodeListsQuery(orgName, customPath), {
    queries: { getSharedResources },
    queryClient,
  });
}
