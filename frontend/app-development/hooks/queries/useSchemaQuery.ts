import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { AxiosError } from 'axios';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { isXsdFile } from 'app-shared/utils/filenameUtils';
import { removeStart } from 'app-shared/utils/stringUtils';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useSchemaQuery = (
  modelPath: string,
): UseQueryResult<JsonSchema | null, AxiosError> => {
  const { org, app } = useStudioUrlParams();
  const { getDatamodel, addXsdFromRepo } = useServicesContext();
  return useQuery<JsonSchema | null, AxiosError>({
    queryKey: [QueryKey.JsonSchema, org, app, modelPath],
    queryFn: async (): Promise<JsonSchema> =>
      isXsdFile(modelPath)
        ? addXsdFromRepo(org, app, removeStart(modelPath, '/'))
        : getDatamodel(org, app, modelPath),
  });
};
