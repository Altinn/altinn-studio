import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { CreateChatThreadPayload } from 'app-shared/types/api';

export const useCreateChatThreadMutation = () => {
  const queryClient = useQueryClient();
  const { createChatThread } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: (payload: CreateChatThreadPayload) => createChatThread(org, app, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatThreads, org, app] });
    },
  });
};
