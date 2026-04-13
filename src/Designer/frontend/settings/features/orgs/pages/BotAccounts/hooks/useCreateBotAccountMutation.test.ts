import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useCreateBotAccountMutation } from './useCreateBotAccountMutation';
import type { CreateBotAccountRequest } from 'app-shared/types/BotAccount';

const testOrg = 'ttd';

const payload: CreateBotAccountRequest = {
  name: 'deploy-bot',
  deployEnvironments: ['tt02'],
};

const renderUseCreateBotAccountMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useCreateBotAccountMutation(testOrg), { queryClient });

describe('useCreateBotAccountMutation', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls createBotAccount with the correct arguments', async () => {
    const { result } = renderUseCreateBotAccountMutation();
    await result.current.mutateAsync(payload);
    expect(queriesMock.createBotAccount).toHaveBeenCalledWith(testOrg, payload);
  });

  it('invalidates the bot accounts query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseCreateBotAccountMutation(queryClient);
    await result.current.mutateAsync(payload);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.BotAccounts, testOrg] }),
    );
  });
});
