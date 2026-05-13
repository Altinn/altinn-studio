import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useChatThreadsQuery } from './useChatThreadsQuery';
import { waitFor } from '@testing-library/react';
import type { ChatThread } from 'app-shared/types/api';

const chatThreads: ChatThread[] = [
  {
    id: 'thread-1',
    title: 'Thread 1',
    org,
    app,
    createdBy: 'tester',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'thread-2',
    title: 'Thread 2',
    org,
    app,
    createdBy: 'tester',
    createdAt: '2025-01-02T00:00:00Z',
  },
];

describe('useChatThreadsQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getChatThreads with the current org and app', async () => {
    const getChatThreads = jest.fn().mockResolvedValue(chatThreads);
    const result = renderHookWithProviders({ getChatThreads })(() => useChatThreadsQuery())
      .renderHookResult.result;

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getChatThreads).toHaveBeenCalledTimes(1);
    expect(getChatThreads).toHaveBeenCalledWith(org, app);
    expect(result.current.data).toEqual(chatThreads);
  });
});
