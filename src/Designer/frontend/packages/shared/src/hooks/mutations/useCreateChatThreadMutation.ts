import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ChatThread, CreateChatThreadPayload } from 'app-shared/types/api';

export const useCreateChatThreadMutation = () => {
  const queryClient = useQueryClient();
  const { createChatThread } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: (payload: CreateChatThreadPayload) => createChatThread(org, app, payload),
    onSuccess: (createdThread) => {
      const queryKey = [QueryKey.ChatThreads, org, app];
      // The assistant ignores events for threads that are not in the list.
      if (createdThread) {
        queryClient.setQueryData<ChatThread[]>(queryKey, (threads = []) =>
          threads.some((thread) => thread.id === createdThread.id)
            ? threads
            : [createdThread, ...threads],
        );
      }
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};
