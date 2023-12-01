import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { isXsdFile } from 'app-shared/utils/filenameUtils';

export const useDeleteDatamodelMutation = () => {
  const { deleteDatamodel } = useServicesContext();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelPath: string) => {
      await deleteDatamodel(org, app, modelPath);
      const respectiveFileNameInXsdOrJson = isXsdFile(modelPath)
        ? modelPath.replace('.xsd', '.schema.json')
        : modelPath.replace('.schema.json', '.xsd');
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], undefined);
      queryClient.setQueryData(
        [QueryKey.JsonSchema, org, app, respectiveFileNameInXsdOrJson],
        undefined,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsXsd, org, app] }),
      ]);
    },
  });
};
