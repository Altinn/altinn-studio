import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useDeleteDatamodelMutation = () => {
  const { deleteDatamodel } = useServicesContext();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelPath: string) => {
      await deleteDatamodel(org, app, modelPath);
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], undefined);
      await Promise.all([
        queryClient.invalidateQueries([QueryKey.DatamodelsJson, org, app]),
        queryClient.invalidateQueries([QueryKey.DatamodelsXsd, org, app]),
      ]);
    },
  })
}
