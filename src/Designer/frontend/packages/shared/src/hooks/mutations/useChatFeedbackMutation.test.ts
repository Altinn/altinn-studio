import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useChatFeedbackMutation } from './useChatFeedbackMutation';
import { waitFor } from '@testing-library/react';
import type { ChatFeedbackPayload } from 'app-shared/types/api';

describe('useChatFeedbackMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls sendChatFeedback with correct arguments and payload', async () => {
    const payload: ChatFeedbackPayload = {
      traceId: 'trace-abc-123',
      thumbsUp: true,
      comment: 'Veldig nyttig!',
    };
    const result = renderHookWithProviders()(() => useChatFeedbackMutation()).renderHookResult
      .result;

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.sendChatFeedback).toHaveBeenCalledTimes(1);
    expect(queriesMock.sendChatFeedback).toHaveBeenCalledWith(org, app, payload);
  });
});
