import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useUpdateChatThreadMutation = () => {
  const queryClient = useQueryClient();
  const { updateChatThread } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation<void, Error, { threadId: string; title: string }>({
    mutationFn: ({ threadId, title }) => updateChatThread(org, app, threadId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatThreads, org, app] });
    },
  });
};
