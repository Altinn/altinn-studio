import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { ChatFeedbackPayload } from 'app-shared/types/api';

type ChatFeedbackMutationArgs = { traceId: string; payload: ChatFeedbackPayload };

export const useChatFeedbackMutation = (org: string, app: string) => {
  const { sendChatFeedback } = useServicesContext();
  return useMutation({
    mutationFn: ({ traceId, payload }: ChatFeedbackMutationArgs) =>
      sendChatFeedback(org, app, traceId, payload),
  });
};
