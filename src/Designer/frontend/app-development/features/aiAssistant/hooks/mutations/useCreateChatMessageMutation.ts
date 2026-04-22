import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { UserMessage, AssistantMessage } from '@studio/assistant';

type CreateChatMessagePayload =
  | (Pick<UserMessage, 'author' | 'content' | 'allowAppChanges'> & {
      attachmentFileNames?: string[];
    })
  | Pick<AssistantMessage, 'author' | 'content' | 'filesChanged' | 'sources'>;

export const useCreateChatMessageMutation = () => {
  const queryClient = useQueryClient();
  const { createChatMessage } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: ({ threadId, payload }: { threadId: string; payload: CreateChatMessagePayload }) =>
      createChatMessage(org, app, threadId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ChatMessages, org, app, variables.threadId],
      });
    },
  });
};
