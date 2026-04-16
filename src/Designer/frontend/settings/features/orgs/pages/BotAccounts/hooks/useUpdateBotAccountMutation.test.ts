import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useUpdateBotAccountMutation } from './useUpdateBotAccountMutation';

const testOrg = 'ttd';
const testBotAccountId = '11111111-1111-1111-1111-111111111111';
const deployEnvironments = ['tt02', 'production'];

const renderUseUpdateBotAccountMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useUpdateBotAccountMutation(testOrg, testBotAccountId), {
    queryClient,
  });

describe('useUpdateBotAccountMutation', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls updateBotAccount with the correct arguments', async () => {
    const { result } = renderUseUpdateBotAccountMutation();
    await result.current.mutateAsync(deployEnvironments);
    expect(queriesMock.updateBotAccount).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      deployEnvironments,
    );
  });

  it('invalidates the bot accounts query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseUpdateBotAccountMutation(queryClient);
    await result.current.mutateAsync(deployEnvironments);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.BotAccounts, testOrg] }),
    );
  });
});
