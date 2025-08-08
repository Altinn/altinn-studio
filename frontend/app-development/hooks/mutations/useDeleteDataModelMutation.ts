import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FileUtils } from '@studio/pure-functions';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';

export const useDeleteDataModelMutation = () => {
  const { deleteDataModel } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelPath: string) => {
      const jsonSchemaPath = FileUtils.isXsdFile(modelPath)
        ? modelPath.replace('.xsd', '.schema.json')
        : modelPath;
      const xsdPath = FileUtils.isXsdFile(modelPath)
        ? modelPath
        : modelPath.replace('.schema.json', '.xsd');
      queryClient.setQueryData(
        [QueryKey.DataModelsJson, org, app],
        (oldData: DataModelMetadata[]) => removeDataModelFromList(oldData, jsonSchemaPath),
      );
      queryClient.setQueryData([QueryKey.DataModelsXsd, org, app], (oldData: DataModelMetadata[]) =>
        removeDataModelFromList(oldData, xsdPath),
      );
      await deleteDataModel(org, app, modelPath);
      return { jsonSchemaPath, xsdPath };
    },
    onSuccess: ({ jsonSchemaPath, xsdPath }) => {
      queryClient.removeQueries({
        queryKey: [QueryKey.JsonSchema, org, app, jsonSchemaPath],
      });
      queryClient.removeQueries({
        queryKey: [QueryKey.JsonSchema, org, app, xsdPath],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
    },
  });
};

export const removeDataModelFromList = (
  dataModels: DataModelMetadata[],
  relativeUrl: string,
): DataModelMetadata[] =>
  dataModels.filter((dataModel) => dataModel.repositoryRelativeUrl !== relativeUrl);
