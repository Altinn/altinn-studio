import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import type { UpdateOrgTextResourcesMutationArgs } from './useUpdateOrgTextResourcesMutation';
import { useUpdateOrgTextResourcesMutation } from './useUpdateOrgTextResourcesMutation';
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
const args: UpdateOrgTextResourcesMutationArgs = { language, payload };

// Mocks:
const response: ITextResourcesWithLanguage = {
  language,
  resources: [label1TextResource, label2TextResource],
};
type Request = ServicesContextProps['updateOrgTextResources'];
const mockRequest: Request = () => Promise.resolve(response);
const updateOrgTextResources = jest.fn().mockImplementation(mockRequest);

describe('useUpdateOrgTextResourcesMutation', () => {
  beforeEach(updateOrgTextResources.mockClear);

  it('Calls updateOrgTextResources with correct arguments and payload', async () => {
    await renderAndMutate();
    expect(updateOrgTextResources).toHaveBeenCalledTimes(1);
    expect(updateOrgTextResources).toHaveBeenCalledWith(orgName, language, payload);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndMutate(client);
    const key: TanstackQueryKey = [QueryKey.OrgTextResources, orgName, language];
    expect(client.getQueryData(key)).toEqual(response);
  });
});

async function renderAndMutate(queryClient = createQueryClientMock()): Promise<void> {
  const { result } = renderHookWithProviders(() => useUpdateOrgTextResourcesMutation(orgName), {
    queries: { updateOrgTextResources },
    queryClient,
  });
  await result.current.mutateAsync(args);
}
