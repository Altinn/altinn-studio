import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { ChatFeedbackPayload } from 'app-shared/types/api';

export const useChatFeedbackMutation = (org: string, app: string) => {
  const { sendChatFeedback } = useServicesContext();
  return useMutation({
    mutationFn: (payload: ChatFeedbackPayload) => sendChatFeedback(org, app, payload),
  });
};
