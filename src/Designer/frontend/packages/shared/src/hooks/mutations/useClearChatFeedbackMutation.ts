import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useClearChatFeedbackMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { clearChatFeedback } = useServicesContext();
  return useMutation({
    mutationFn: (traceId: string) => clearChatFeedback(org, app, traceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatMessages, org, app] });
    },
  });
};
