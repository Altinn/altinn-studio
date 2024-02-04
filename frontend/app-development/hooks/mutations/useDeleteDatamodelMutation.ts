import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { isXsdFile } from 'app-shared/utils/filenameUtils';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

export const useDeleteDatamodelMutation = () => {
  const { deleteDatamodel } = useServicesContext();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelPath: string) => {
      queryClient.setQueryData(
        [QueryKey.DatamodelsJson, org, app],
        (oldData: DatamodelMetadata[]) => removeDatamodelFromList(oldData, modelPath),
      );
      queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], (oldData: DatamodelMetadata[]) =>
        removeDatamodelFromList(oldData, modelPath),
      );
      const respectiveFileNameInXsdOrJson = isXsdFile(modelPath)
        ? modelPath.replace('.xsd', '.schema.json')
        : modelPath.replace('.schema.json', '.xsd');
      queryClient.removeQueries({
        queryKey: [QueryKey.JsonSchema, org, app, respectiveFileNameInXsdOrJson],
      });
      await deleteDatamodel(org, app, modelPath);
    },
  });
};

const removeDatamodelFromList = (
  datamodels: DatamodelMetadata[],
  relativeUrl: string,
): DatamodelMetadata[] =>
  datamodels.filter((datamodel) => datamodel.repositoryRelativeUrl !== relativeUrl);
