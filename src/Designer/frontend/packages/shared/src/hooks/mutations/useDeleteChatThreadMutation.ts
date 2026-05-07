import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useDeleteChatThreadMutation = () => {
  const queryClient = useQueryClient();
  const { deleteChatThread } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: (threadId: string) => deleteChatThread(org, app, threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatThreads, org, app] });
    },
  });
};
