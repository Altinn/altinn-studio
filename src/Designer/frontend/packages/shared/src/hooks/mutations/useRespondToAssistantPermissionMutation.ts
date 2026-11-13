import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { AssistantPermissionResponsePayload } from 'app-shared/types/api';

type RespondToAssistantPermissionMutationArgs = {
  threadId: string;
  payload: AssistantPermissionResponsePayload;
};

export const useRespondToAssistantPermissionMutation = () => {
  const { respondToAssistantPermission } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: ({ threadId, payload }: RespondToAssistantPermissionMutationArgs) =>
      respondToAssistantPermission(org, app, threadId, payload),
  });
};
