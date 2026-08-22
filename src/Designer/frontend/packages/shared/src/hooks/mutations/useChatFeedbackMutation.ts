import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ChatFeedbackPayload } from 'app-shared/types/api';

type ChatFeedbackMutationArgs = { traceId: string; payload: ChatFeedbackPayload };

export const useChatFeedbackMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { sendChatFeedback } = useServicesContext();
  return useMutation({
    mutationFn: ({ traceId, payload }: ChatFeedbackMutationArgs) =>
      sendChatFeedback(org, app, traceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatMessages, org, app] });
    },
  });
};
