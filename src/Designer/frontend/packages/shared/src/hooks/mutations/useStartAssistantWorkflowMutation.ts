import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type StartAssistantWorkflowMutationArgs = { threadId: string; payload: FormData };

export const useStartAssistantWorkflowMutation = () => {
  const { startAssistantWorkflow } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: ({ threadId, payload }: StartAssistantWorkflowMutationArgs) =>
      startAssistantWorkflow(org, app, threadId, payload),
  });
};
