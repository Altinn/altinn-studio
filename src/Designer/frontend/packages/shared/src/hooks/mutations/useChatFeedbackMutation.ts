import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ChatFeedbackPayload } from 'app-shared/types/api';

export const useChatFeedbackMutation = () => {
  const { sendChatFeedback } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: (payload: ChatFeedbackPayload) => sendChatFeedback(org, app, payload),
  });
};
