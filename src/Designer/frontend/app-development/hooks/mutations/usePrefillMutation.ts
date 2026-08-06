import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const usePrefillMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();
  const { saveDataModelPrefill } = useServicesContext();
  return useMutation({
    mutationFn: async (args: { modelPath: string; prefillConfig: PrefillConfig }) => {
      const { modelPath, prefillConfig } = args;
      queryClient.setQueryData([QueryKey.Prefill, org, app, modelPath], () => prefillConfig);
      await saveDataModelPrefill(org, app, modelPath, prefillConfig);
    },
  });
};
