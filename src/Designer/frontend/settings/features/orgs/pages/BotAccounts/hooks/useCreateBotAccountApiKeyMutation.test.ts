import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useCreateBotAccountApiKeyMutation } from './useCreateBotAccountApiKeyMutation';
import type { CreateBotAccountApiKeyRequest } from 'app-shared/types/BotAccount';

const testOrg = 'ttd';
const testBotAccountId = '11111111-1111-1111-1111-111111111111';

const payload: CreateBotAccountApiKeyRequest = {
  name: 'Deploy key',
  expiresAt: '2099-12-31T23:59:59Z',
};

const renderUseCreateBotAccountApiKeyMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useCreateBotAccountApiKeyMutation(testOrg, testBotAccountId), {
    queryClient,
  });

describe('useCreateBotAccountApiKeyMutation', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls createBotAccountApiKey with the correct arguments', async () => {
    const { result } = renderUseCreateBotAccountApiKeyMutation();
    await result.current.mutateAsync(payload);
    expect(queriesMock.createBotAccountApiKey).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      payload,
    );
  });

  it('invalidates the bot account api keys query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseCreateBotAccountApiKeyMutation(queryClient);
    await result.current.mutateAsync(payload);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [QueryKey.BotAccountApiKeys, testOrg, testBotAccountId],
      }),
    );
  });
});
