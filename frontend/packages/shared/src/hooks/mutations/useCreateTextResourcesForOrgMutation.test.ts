import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useCreateTextResourcesForOrgMutation } from './useCreateTextResourcesForOrgMutation';
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
type Request = ServicesContextProps['createTextResourcesForOrg'];
const mockRequest: Request = () => Promise.resolve(response);
const createTextResourcesForOrg = jest.fn().mockImplementation(mockRequest);

describe('useCreateTextResourcesForOrgMutation', () => {
  beforeEach(createTextResourcesForOrg.mockClear);

  it('Calls createTextResourcesForOrg with correct arguments and payload', async () => {
    await renderAndMutate();

    const expectedPayload: ITextResourcesWithLanguage = {
      language,
      resources: [],
    };
    expect(createTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(createTextResourcesForOrg).toHaveBeenCalledWith(orgName, language, expectedPayload);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndMutate(client);

    const key: TanstackQueryKey = [QueryKey.TextResourcesForOrg, orgName, language];
    expect(client.getQueryData(key)).toEqual(response);
  });
});

async function renderAndMutate(queryClient = createQueryClientMock()): Promise<void> {
  const { result } = renderHookWithProviders(() => useCreateTextResourcesForOrgMutation(orgName), {
    queries: { createTextResourcesForOrg },
    queryClient,
  });
  await result.current.mutateAsync(language);
}
