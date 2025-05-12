import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useCreateOrgTextResourcesMutation } from './useCreateOrgTextResourcesMutation';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'org';
const language = 'nb';

// Mocks:
const response: ITextResourcesWithLanguage = {
  language,
  resources: [],
};
type Request = ServicesContextProps['createOrgTextResources'];
const mockRequest: Request = () => Promise.resolve(response);
const createOrgTextResources = jest.fn().mockImplementation(mockRequest);

describe('useCreateOrgTextResourcesMutation', () => {
  beforeEach(createOrgTextResources.mockClear);

  it('Calls createOrgTextResources with correct arguments and payload', async () => {
    await renderAndMutate();

    const expectedPayload: ITextResourcesWithLanguage = {
      language,
      resources: [],
    };
    expect(createOrgTextResources).toHaveBeenCalledTimes(1);
    expect(createOrgTextResources).toHaveBeenCalledWith(orgName, language, expectedPayload);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndMutate(client);

    const key: TanstackQueryKey = [QueryKey.OrgTextResources, orgName, language];
    expect(client.getQueryData(key)).toEqual(response);
  });
});

async function renderAndMutate(queryClient = createQueryClientMock()): Promise<void> {
  const { result } = renderHookWithProviders(() => useCreateOrgTextResourcesMutation(orgName), {
    queries: { createOrgTextResources },
    queryClient,
  });
  await result.current.mutateAsync(language);
}
