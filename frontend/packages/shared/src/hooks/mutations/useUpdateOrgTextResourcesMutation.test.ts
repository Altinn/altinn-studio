import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import type {
  UpdateOrgTextResourcesMutationArgs,
  UseUpdateOrgTextResourcesMutationResult,
} from './useUpdateOrgTextResourcesMutation';
import { useUpdateOrgTextResourcesMutation } from './useUpdateOrgTextResourcesMutation';
import { label1TextResource, label2TextResource } from '../../mocks/textResourcesMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient, QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { RenderHookResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';

// Test data:
const orgName = 'org';
const language = 'nb';
const oldData: ITextResourcesWithLanguage = {
  language,
  resources: [label1TextResource],
};
const payload: KeyValuePairs<string> = {
  [label1TextResource.id]: label1TextResource.value,
  [label2TextResource.id]: label2TextResource.value,
};
const args: UpdateOrgTextResourcesMutationArgs = { language, payload };

// Mocks:
const updatedData: ITextResourcesWithLanguage = {
  language,
  resources: [label1TextResource, label2TextResource],
};
type Request = ServicesContextProps['updateOrgTextResources'];
const mockRequest: Request = () => Promise.resolve(updatedData);
const updateOrgTextResources = jest.fn().mockImplementation(mockRequest);

describe('useUpdateOrgTextResourcesMutation', () => {
  beforeEach(updateOrgTextResources.mockClear);

  it('Calls updateOrgTextResources with correct arguments and payload', async () => {
    const { result } = render();
    await result.current.mutateAsync(args);
    expect(updateOrgTextResources).toHaveBeenCalledTimes(1);
    expect(updateOrgTextResources).toHaveBeenCalledWith(orgName, language, payload);
  });

  it('Replaces the data with the correct keys in the cache', async () => {
    const client = createQueryClientWithData();
    const { result } = render(client);
    result.current.mutate(args);
    await waitFor(expect(updateOrgTextResources).toHaveBeenCalled);
    const key: TanstackQueryKey = [QueryKey.OrgTextResources, orgName, language];
    expect(client.getQueryData(key)).toEqual(updatedData);
  });

  it('Stores the result in the cache with correct keys when there is no previous data', async () => {
    const client = createQueryClientMock();
    const { result } = render(client);
    result.current.mutate(args);
    await waitFor(expect(updateOrgTextResources).toHaveBeenCalled);
    const key: TanstackQueryKey = [QueryKey.OrgTextResources, orgName, language];
    expect(client.getQueryData(key)).toEqual(updatedData);
  });

  it('Invalidates the data on error', async () => {
    const client = createQueryClientWithData();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    const { result } = render(client);
    updateOrgTextResources.mockRejectedValueOnce(new Error('Error'));
    result.current.mutate(args);
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

function createQueryClientWithData(): QueryClient {
  const client = createQueryClientMock();
  client.setQueryData([QueryKey.OrgTextResources, orgName, language], oldData);
  return client;
}

function render(
  queryClient = createQueryClientMock(),
): RenderHookResult<UseUpdateOrgTextResourcesMutationResult, void> {
  return renderHookWithProviders(() => useUpdateOrgTextResourcesMutation(orgName), {
    queries: { updateOrgTextResources },
    queryClient,
  });
}
