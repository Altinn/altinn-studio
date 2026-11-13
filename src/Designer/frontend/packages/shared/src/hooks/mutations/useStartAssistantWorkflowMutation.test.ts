import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@designer/testing/testids';
import { useStartAssistantWorkflowMutation } from './useStartAssistantWorkflowMutation';

describe('useStartAssistantWorkflowMutation', () => {
  it('Calls startAssistantWorkflow with the thread and the form data', async () => {
    const payload = new FormData();
    payload.append('goal', 'Lag et skjema');
    const result = renderHookWithProviders()(() => useStartAssistantWorkflowMutation())
      .renderHookResult.result;

    result.current.mutate({ threadId: 'thread-1', payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.startAssistantWorkflow).toHaveBeenCalledTimes(1);
    expect(queriesMock.startAssistantWorkflow).toHaveBeenCalledWith(org, app, 'thread-1', payload);
  });
});
