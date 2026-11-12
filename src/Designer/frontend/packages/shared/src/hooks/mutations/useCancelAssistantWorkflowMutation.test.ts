import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useCancelAssistantWorkflowMutation } from './useCancelAssistantWorkflowMutation';

describe('useCancelAssistantWorkflowMutation', () => {
  it('Calls cancelAssistantWorkflow with the thread', async () => {
    const result = renderHookWithProviders()(() => useCancelAssistantWorkflowMutation())
      .renderHookResult.result;

    result.current.mutate('thread-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.cancelAssistantWorkflow).toHaveBeenCalledTimes(1);
    expect(queriesMock.cancelAssistantWorkflow).toHaveBeenCalledWith(org, app, 'thread-1');
  });
});
