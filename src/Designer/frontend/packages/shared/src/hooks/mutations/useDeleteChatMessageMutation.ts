import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type DeleteChatMessageMutationArgs = { threadId: string; messageId: string };

export const useDeleteChatMessageMutation = () => {
  const queryClient = useQueryClient();
  const { deleteChatMessage } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();

  return useMutation({
    mutationFn: ({ threadId, messageId }: DeleteChatMessageMutationArgs) =>
      deleteChatMessage(org, app, threadId, messageId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ChatMessages, org, app, variables.threadId],
      });
    },
  });
};
