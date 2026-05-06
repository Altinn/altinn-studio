import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useRevokeBotAccountApiKeyMutation } from './useRevokeBotAccountApiKeyMutation';
import type { BotAccount } from 'app-shared/types/BotAccount';

const testOrg = 'ttd';
const testBotAccountId = '11111111-1111-1111-1111-111111111111';
const testKeyId = 1;

const renderUseRevokeBotAccountApiKeyMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useRevokeBotAccountApiKeyMutation(testOrg, testBotAccountId), {
    queryClient,
  });

describe('useRevokeBotAccountApiKeyMutation', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls revokeBotAccountApiKey with the correct arguments', async () => {
    const { result } = renderUseRevokeBotAccountApiKeyMutation();
    await result.current.mutateAsync(testKeyId);
    expect(queriesMock.revokeBotAccountApiKey).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      testKeyId,
    );
  });

  it('invalidates the bot account api keys query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseRevokeBotAccountApiKeyMutation(queryClient);
    await result.current.mutateAsync(testKeyId);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [QueryKey.BotAccountApiKeys, testOrg, testBotAccountId],
      }),
    );
  });

  it('decrements apiKeyCount in BotAccounts cache on success', async () => {
    const queryClient = createQueryClientMock();
    const botAccount: BotAccount = {
      id: testBotAccountId,
      username: 'test-bot',
      organizationName: testOrg,
      deactivated: false,
      created: '2024-01-15T10:00:00Z',
      createdByUsername: 'testuser',
      deployEnvironments: [],
      apiKeyCount: 2,
    };
    queryClient.setQueryData([QueryKey.BotAccounts, testOrg], [botAccount]);

    const { result } = renderUseRevokeBotAccountApiKeyMutation(queryClient);
    await result.current.mutateAsync(testKeyId);

    const botAccounts = queryClient.getQueryData<BotAccount[]>([QueryKey.BotAccounts, testOrg]);
    expect(botAccounts?.[0].apiKeyCount).toBe(1);
  });

  it('does not go below 0 when revoking keys', async () => {
    const queryClient = createQueryClientMock();
    const botAccount: BotAccount = {
      id: testBotAccountId,
      username: 'test-bot',
      organizationName: testOrg,
      deactivated: false,
      created: '2024-01-15T10:00:00Z',
      createdByUsername: 'testuser',
      deployEnvironments: [],
      apiKeyCount: 0,
    };
    queryClient.setQueryData([QueryKey.BotAccounts, testOrg], [botAccount]);

    const { result } = renderUseRevokeBotAccountApiKeyMutation(queryClient);
    await result.current.mutateAsync(testKeyId);

    const botAccounts = queryClient.getQueryData<BotAccount[]>([QueryKey.BotAccounts, testOrg]);
    expect(botAccounts?.[0].apiKeyCount).toBe(0);
  });
});
