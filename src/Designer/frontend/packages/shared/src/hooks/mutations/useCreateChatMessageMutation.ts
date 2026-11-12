import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ChatMessage, CreateChatMessagePayload } from 'app-shared/types/api';

type CreateChatMessageMutationArgs = { threadId: string; payload: CreateChatMessagePayload };

export const useCreateChatMessageMutation = () => {
  const queryClient = useQueryClient();
  const { createChatMessage } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: ({ threadId, payload }: CreateChatMessageMutationArgs) =>
      createChatMessage(org, app, threadId, payload),
    onSuccess: (createdMessage, { threadId }) => {
      const queryKey = [QueryKey.ChatMessages, org, app, threadId];
      // invalidateQueries restarts a running fetch only when the query has data. Without the saved
      // message here, the first fetch of a new thread can read the thread before the save.
      if (createdMessage) {
        queryClient.setQueryData<ChatMessage[]>(queryKey, (messages = []) => [
          ...messages,
          createdMessage,
        ]);
      }
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};
