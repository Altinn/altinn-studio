import { createQueryClientMock } from '../../mocks/queryClientMock';
import type { QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { usePublishedResourcesQuery } from 'app-shared/hooks/queries/usePublishedResourcesQuery';
import { waitFor } from '@testing-library/react';

// Test data:
const org = 'testOrg';
const path = 'code_lists';
const response: string[] = ['1.json', '2.json', '_latest.json'];
const getPublishedResources = jest.fn(() => Promise.resolve(response));

describe('usePublishedResourcesQuery', () => {
  beforeEach(getPublishedResources.mockClear);

  it('Calls usePublishedResourcesQuery with the correct parameters', () => {
    renderHookWithProviders(() => usePublishedResourcesQuery(org, path), {
      queries: { getPublishedResources },
    });
    expect(getPublishedResources).toHaveBeenCalledTimes(1);
    expect(getPublishedResources).toHaveBeenCalledWith(org, path);
  });

  it('Stores the result in the cache with correct keys when path is set', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderHookWithProviders(() => usePublishedResourcesQuery(org, path), {
      queries: { getPublishedResources },
      queryClient,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key: TanstackQueryKey = [QueryKey.PublishedResources, org, path];
    expect(queryClient.getQueryData(key)).toEqual(response);
  });

  it('Stores the result in the cache with correct keys when path is not set', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderHookWithProviders(() => usePublishedResourcesQuery(org), {
      queries: { getPublishedResources },
      queryClient,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key: TanstackQueryKey = [QueryKey.PublishedResources, org, null];
    expect(queryClient.getQueryData(key)).toEqual(response);
  });
});
