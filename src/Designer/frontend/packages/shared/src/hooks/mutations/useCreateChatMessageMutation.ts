import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { CreateChatMessagePayload } from 'app-shared/types/api';

type CreateChatMessageMutationArgs = { threadId: string; payload: CreateChatMessagePayload };

export const useCreateChatMessageMutation = () => {
  const queryClient = useQueryClient();
  const { createChatMessage } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: ({ threadId, payload }: CreateChatMessageMutationArgs) =>
      createChatMessage(org, app, threadId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.ChatMessages, org, app, variables.threadId],
      });
    },
  });
};
