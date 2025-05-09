import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { RenderHookResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useOrgTextResourcesQuery } from './useOrgTextResourcesQuery';
import { textResourcesMock } from 'app-shared/mocks/textResourcesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type {
  QueryClient,
  QueryKey as TanstackQueryKey,
  UseQueryResult,
} from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';

// Test data:
const orgName = 'org';
const language = 'nb';
const textResources = textResourcesMock;
const key: TanstackQueryKey = [QueryKey.OrgTextResources, orgName, language];

// Mocks:
const getOrgTextResources = jest.fn(() => Promise.resolve(textResources));

describe('useOrgTextResourcesQuery', () => {
  beforeEach(getOrgTextResources.mockClear);

  it('calls getOrgTextResources with the correct parameters', async () => {
    await renderAndWaitForResult();
    expect(getOrgTextResources).toHaveBeenCalledTimes(1);
    expect(getOrgTextResources).toHaveBeenCalledWith(orgName, language);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndWaitForResult(client);
    expect(client.getQueryData(key)).toEqual(textResources);
  });

  it('Returns the result through the data property', async () => {
    const { result } = await renderAndWaitForResult();
    expect(result.current.data).toEqual(textResources);
  });

  it('Returns a fallback object through the data property when the data is null', async () => {
    getOrgTextResources.mockReturnValueOnce(Promise.resolve(null));
    const { result } = await renderAndWaitForResult();
    const expectedFallback: ITextResourcesWithLanguage = {
      language: expect.any(String),
      resources: [],
    };
    expect(result.current.data).toEqual(expectedFallback);
  });
});

const renderAndWaitForResult = async (
  queryClient: QueryClient = createQueryClientMock(),
): Promise<RenderHookResult<UseQueryResult<ITextResourcesWithLanguage>, void>> => {
  const utils = renderHookWithProviders<UseQueryResult<ITextResourcesWithLanguage>>(
    () => useOrgTextResourcesQuery(orgName, language),
    {
      queries: { getOrgTextResources },
      queryClient,
    },
  );
  await waitFor(() => expect(utils.result.current.isSuccess).toBe(true));
  return utils;
};
