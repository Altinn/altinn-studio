import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { createApiErrorMock } from '../../mocks/apiErrorMock';
import { ServerCodes } from '../../enums/ServerCodes';
import { usePreviewSessionInstanceQuery } from './usePreviewSessionInstanceQuery';
import { usePreviewSessionQuery } from './usePreviewSessionQuery';
import { app, org } from '@designer/testing/testids';

const sessionUrl = 'https://preview.example/session/';
const newSessionUrl = 'https://preview.example/new-session/';

const useInstanceInSession = (taskId: string) => {
  const { data: session } = usePreviewSessionQuery(org, app);
  return usePreviewSessionInstanceQuery(org, app, session?.url, taskId);
};

describe('usePreviewSessionInstanceQuery', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates an instance at the task in the session', async () => {
    const createPreviewSessionInstance = vi.fn().mockResolvedValue({ instanceId: '51001/guid' });
    const { result } = renderHookWithProviders(
      () => usePreviewSessionInstanceQuery(org, app, sessionUrl, 'Task_1'),
      { queries: { createPreviewSessionInstance } },
    );

    await waitFor(() => expect(result.current.data?.instanceId).toBe('51001/guid'));
    expect(createPreviewSessionInstance).toHaveBeenCalledWith(org, app, sessionUrl, 'Task_1');
  });

  it('keeps the instance of a task while the page shows another task', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const createPreviewSessionInstance = vi
      .fn()
      .mockImplementation((_org, _app, _sessionUrl, taskId) =>
        Promise.resolve({ instanceId: `51001/${taskId}` }),
      );
    let taskId = 'Task_1';
    const { result, rerender } = renderHookWithProviders(
      () => usePreviewSessionInstanceQuery(org, app, sessionUrl, taskId),
      { queries: { createPreviewSessionInstance } },
    );
    await waitFor(() => expect(result.current.data?.instanceId).toBe('51001/Task_1'));
    taskId = 'Task_2';
    rerender();
    await waitFor(() => expect(result.current.data?.instanceId).toBe('51001/Task_2'));

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    taskId = 'Task_1';
    rerender();

    expect(result.current.data?.instanceId).toBe('51001/Task_1');
    expect(createPreviewSessionInstance).toHaveBeenCalledTimes(2);
  });

  it('starts a new session and creates the instance there when the session has ended', async () => {
    const startPreviewSession = vi
      .fn()
      .mockResolvedValueOnce({ url: sessionUrl })
      .mockResolvedValueOnce({ url: newSessionUrl });
    const createPreviewSessionInstance = vi
      .fn()
      .mockImplementation((_org, _app, url) =>
        url === sessionUrl
          ? Promise.reject(createApiErrorMock(ServerCodes.NotFound))
          : Promise.resolve({ instanceId: '51001/new' }),
      );
    const { result } = renderHookWithProviders(() => useInstanceInSession('Task_1'), {
      queries: { startPreviewSession, createPreviewSessionInstance },
    });

    await waitFor(() => expect(result.current.data?.instanceId).toBe('51001/new'));
    expect(startPreviewSession).toHaveBeenCalledTimes(2);
    expect(createPreviewSessionInstance).toHaveBeenLastCalledWith(
      org,
      app,
      newSessionUrl,
      'Task_1',
    );
  });
});
