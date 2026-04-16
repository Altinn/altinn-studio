import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useGetBotAccountApiKeysQuery } from './useGetBotAccountApiKeysQuery';
import type { BotAccountApiKey } from 'app-shared/types/BotAccount';

const testOrg = 'ttd';
const testBotAccountId = '11111111-1111-1111-1111-111111111111';

const sampleApiKey: BotAccountApiKey = {
  id: 1,
  name: 'Test key',
  expiresAt: '2099-12-31T23:59:59Z',
  createdAt: '2024-01-15T10:00:00Z',
  createdByUsername: 'testuser',
};

describe('useGetBotAccountApiKeysQuery', () => {
  it('should fetch and return bot account API keys', async () => {
    const queryClient = createQueryClientMock();
    const queries = { getBotAccountApiKeys: jest.fn().mockResolvedValue([sampleApiKey]) };

    const { result } = renderHookWithProviders(
      () => useGetBotAccountApiKeysQuery(testOrg, testBotAccountId),
      { queryClient, queries },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([sampleApiKey]);
    expect(queries.getBotAccountApiKeys).toHaveBeenCalledWith(testOrg, testBotAccountId);
  });

  it('should not fetch when botAccountId is empty', () => {
    const queryClient = createQueryClientMock();
    const queries = { getBotAccountApiKeys: jest.fn() };

    renderHookWithProviders(() => useGetBotAccountApiKeysQuery(testOrg, ''), {
      queryClient,
      queries,
    });

    expect(queries.getBotAccountApiKeys).not.toHaveBeenCalled();
  });

  it('should return empty array when bot has no keys', async () => {
    const queryClient = createQueryClientMock();
    const queries = { getBotAccountApiKeys: jest.fn().mockResolvedValue([]) };

    const { result } = renderHookWithProviders(
      () => useGetBotAccountApiKeysQuery(testOrg, testBotAccountId),
      { queryClient, queries },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
