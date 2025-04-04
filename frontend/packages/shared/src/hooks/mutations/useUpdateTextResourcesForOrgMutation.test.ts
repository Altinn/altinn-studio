import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import type { UpdateTextResourcesForOrgMutationArgs } from './useUpdateTextResourcesForOrgMutation';
import { useUpdateTextResourcesForOrgMutation } from './useUpdateTextResourcesForOrgMutation';
import { label1TextResource, label2TextResource } from '../../mocks/textResourcesMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';

// Test data:
const orgName = 'org';
const language = 'nb';
const payload: KeyValuePairs<string> = {
  [label1TextResource.id]: label1TextResource.value,
  [label2TextResource.id]: label2TextResource.value,
};
const args: UpdateTextResourcesForOrgMutationArgs = { language, payload };

// Mocks:
const response: ITextResourcesWithLanguage = {
  language,
  resources: [label1TextResource, label2TextResource],
};
type Request = ServicesContextProps['updateTextResourcesForOrg'];
const mockRequest: Request = () => Promise.resolve(response);
const updateTextResourcesForOrg = jest.fn().mockImplementation(mockRequest);

describe('useUpdateTextResourcesForOrgMutation', () => {
  beforeEach(updateTextResourcesForOrg.mockClear);

  it('Calls updateTextResourcesForOrg with correct arguments and payload', async () => {
    await renderAndMutate();
    expect(updateTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(updateTextResourcesForOrg).toHaveBeenCalledWith(orgName, language, payload);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndMutate(client);
    const key: TanstackQueryKey = [QueryKey.TextResourcesForOrg, orgName, language];
    expect(client.getQueryData(key)).toEqual(response);
  });
});

async function renderAndMutate(queryClient = createQueryClientMock()): Promise<void> {
  const { result } = renderHookWithProviders(() => useUpdateTextResourcesForOrgMutation(orgName), {
    queries: { updateTextResourcesForOrg },
    queryClient,
  });
  await result.current.mutateAsync(args);
}
