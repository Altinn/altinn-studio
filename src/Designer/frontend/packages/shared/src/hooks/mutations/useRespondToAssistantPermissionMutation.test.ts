import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@designer/testing/testids';
import { useRespondToAssistantPermissionMutation } from './useRespondToAssistantPermissionMutation';

describe('useRespondToAssistantPermissionMutation', () => {
  it('Calls respondToAssistantPermission with the thread and the answer', async () => {
    const payload = { requestId: 'request-1', granted: true };
    const result = renderHookWithProviders()(() => useRespondToAssistantPermissionMutation())
      .renderHookResult.result;

    result.current.mutate({ threadId: 'thread-1', payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.respondToAssistantPermission).toHaveBeenCalledTimes(1);
    expect(queriesMock.respondToAssistantPermission).toHaveBeenCalledWith(
      org,
      app,
      'thread-1',
      payload,
    );
  });
});
