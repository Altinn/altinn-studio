import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { app, org } from '@studio/testing/testids';
import { useChatFeedbackMutation } from './useChatFeedbackMutation';
import { waitFor } from '@testing-library/react';

describe('useChatFeedbackMutation', () => {
  afterEach(jest.clearAllMocks);

  it('calls sendChatFeedback with correct arguments', async () => {
    const traceId = 'trace-abc-123';
    const payload = { thumbsUp: true, comment: 'Veldig nyttig!' };
    const { result } = renderHookWithProviders(() => useChatFeedbackMutation(org, app));

    result.current.mutate({ traceId, payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.sendChatFeedback).toHaveBeenCalledTimes(1);
    expect(queriesMock.sendChatFeedback).toHaveBeenCalledWith(org, app, traceId, payload);
  });
});
