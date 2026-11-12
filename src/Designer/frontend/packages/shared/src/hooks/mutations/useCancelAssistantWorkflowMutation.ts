import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useCancelAssistantWorkflowMutation = () => {
  const { cancelAssistantWorkflow } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useMutation({
    mutationFn: (threadId: string) => cancelAssistantWorkflow(org, app, threadId),
  });
};
