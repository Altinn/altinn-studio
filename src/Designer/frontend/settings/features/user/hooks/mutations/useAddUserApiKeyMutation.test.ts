import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { useAddUserApiKeyMutation } from './useAddUserApiKeyMutation';
import type { AddUserApiKeyRequest } from 'app-shared/types/api/AddUserApiKeyRequest';

const payload: AddUserApiKeyRequest = {
  name: 'My key',
  expiresAt: '2099-12-31T23:59:59Z',
};

const renderUseAddUserApiKeyMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useAddUserApiKeyMutation(), { queryClient });

describe('useAddUserApiKeyMutation', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls addUserApiKey with the correct payload', async () => {
    const { result } = renderUseAddUserApiKeyMutation();
    await result.current.mutateAsync(payload);
    expect(queriesMock.addUserApiKey).toHaveBeenCalledWith(payload);
  });

  it('invalidates the user api keys query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseAddUserApiKeyMutation(queryClient);
    await result.current.mutateAsync(payload);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.UserApiKeys] }),
    );
  });
});
