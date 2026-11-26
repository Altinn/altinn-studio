import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';

export type SavePrefillArgs = {
  modelPath: string;
  prefillConfig: PrefillConfig;
};

export const useSavePrefillMutation = (org: string, app: string) => {
  const { saveDataModelPrefill } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelPath, prefillConfig }: SavePrefillArgs) =>
      saveDataModelPrefill(org, app, modelPath, prefillConfig),
    onMutate: ({ modelPath, prefillConfig }: SavePrefillArgs): void => {
      queryClient.setQueryData([QueryKey.Prefill, org, app, modelPath], prefillConfig);
    },
    onError: (_error, { modelPath }) =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.Prefill, org, app, modelPath] }),
  });
};
