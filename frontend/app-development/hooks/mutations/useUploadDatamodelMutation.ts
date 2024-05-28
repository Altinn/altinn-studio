import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useUploadDatamodelMutation = (meta?: MutationMeta) => {
  const { uploadDatamodel } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: FormData) => uploadDatamodel(org, app, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsXsd, org, app] }),
      ]);
    },
    meta,
  });
};
