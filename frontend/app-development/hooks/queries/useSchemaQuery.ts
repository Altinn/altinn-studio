import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { isXsdFile } from 'app-shared/utils/filenameUtils';
import { StringUtils } from '@studio/pure-functions';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useSchemaQuery = (modelPath: string) => {
  const { org, app } = useStudioEnvironmentParams();
  const { getDataModel, addXsdFromRepo } = useServicesContext();
  return useQuery<JsonSchema>({
    queryKey: [QueryKey.JsonSchema, org, app, modelPath],
    queryFn: async (): Promise<JsonSchema> =>
      isXsdFile(modelPath)
        ? addXsdFromRepo(org, app, StringUtils.removeStart(modelPath, '/'))
        : getDataModel(org, app, modelPath),
    structuralSharing: false,
  });
};
