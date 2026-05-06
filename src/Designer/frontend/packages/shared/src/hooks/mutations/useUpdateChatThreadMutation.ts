import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ChatThread } from 'app-shared/types/api';

export type UpdateChatThreadMutationArgs = Pick<ChatThread, 'id' | 'title'>;

export const useUpdateChatThreadMutation = () => {
  const queryClient = useQueryClient();
  const { updateChatThread } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: ({ id, title }: UpdateChatThreadMutationArgs) =>
      updateChatThread(org, app, id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatThreads, org, app] });
    },
  });
};
