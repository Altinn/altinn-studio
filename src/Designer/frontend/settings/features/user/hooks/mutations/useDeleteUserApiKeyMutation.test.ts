import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { useDeleteUserApiKeyMutation } from './useDeleteUserApiKeyMutation';
import type { UserApiKey } from 'app-shared/types/api/UserApiKey';

const existingKey: UserApiKey = {
  id: 1,
  name: 'My key',
  expiresAt: '2099-01-01T00:00:00',
  createdAt: '2024-01-01T00:00:00',
};

const anotherKey: UserApiKey = {
  id: 2,
  name: 'Another key',
  expiresAt: '2099-01-01T00:00:00',
  createdAt: '2024-01-01T00:00:00',
};

const renderUseDeleteUserApiKeyMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useDeleteUserApiKeyMutation(), { queryClient });

describe('useDeleteUserApiKeyMutation', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls deleteUserApiKey with the correct id', async () => {
    const { result } = renderUseDeleteUserApiKeyMutation();
    await result.current.mutateAsync(existingKey.id);
    expect(queriesMock.deleteUserApiKey).toHaveBeenCalledWith(existingKey.id);
  });

  it('removes the deleted key from the query cache on success', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData<UserApiKey[]>([QueryKey.UserApiKeys], [existingKey, anotherKey]);
    const { result } = renderUseDeleteUserApiKeyMutation(queryClient);
    await result.current.mutateAsync(existingKey.id);
    const cached = queryClient.getQueryData<UserApiKey[]>([QueryKey.UserApiKeys]);
    expect(cached).toEqual([anotherKey]);
  });

  it('does not remove other keys from the cache', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData<UserApiKey[]>([QueryKey.UserApiKeys], [existingKey, anotherKey]);
    const { result } = renderUseDeleteUserApiKeyMutation(queryClient);
    await result.current.mutateAsync(existingKey.id);
    const cached = queryClient.getQueryData<UserApiKey[]>([QueryKey.UserApiKeys]);
    expect(cached?.find((k) => k.id === anotherKey.id)).toBeDefined();
  });
});
