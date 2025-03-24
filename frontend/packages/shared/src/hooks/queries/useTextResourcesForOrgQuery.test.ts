import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { waitFor } from '@testing-library/react';
import { useTextResourcesForOrgQuery } from './useTextResourcesForOrgQuery';
import { textResourcesMock } from 'app-shared/mocks/textResourcesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'org';
const language = 'nb';
const textResources = textResourcesMock;

// Mocks:
const getTextResourcesForOrg = jest.fn(() => Promise.resolve(textResources));

describe('useTextResourcesForOrgQuery', () => {
  beforeEach(getTextResourcesForOrg.mockClear);

  it('calls getTextResourcesForOrg with the correct parameters', async () => {
    await renderAndWaitForResult();
    expect(getTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(getTextResourcesForOrg).toHaveBeenCalledWith(orgName, language);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndWaitForResult(client);
    const key: TanstackQueryKey = [QueryKey.TextResourcesForOrg, orgName, language];
    expect(client.getQueryData(key)).toEqual(textResources);
  });
});

const renderAndWaitForResult = async (
  queryClient: QueryClient = createQueryClientMock(),
): Promise<void> => {
  const { result } = renderHookWithProviders(() => useTextResourcesForOrgQuery(orgName, language), {
    queries: { getTextResourcesForOrg },
    queryClient,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
};
