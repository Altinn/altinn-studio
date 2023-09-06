import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { isXsdFile } from 'app-shared/utils/filenameUtils';
import { removeStart } from 'app-shared/utils/stringUtils';

export const useSchemaQuery = (modelPath: string): UseQueryResult<JsonSchema | null, AxiosError> => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { getDatamodel, addXsdFromRepo } = useServicesContext();
  return useQuery<JsonSchema | null, AxiosError>(
    [QueryKey.JsonSchema, org, app, modelPath],
    async () => (
      isXsdFile(modelPath)
        ? addXsdFromRepo(org, app, removeStart(modelPath, '/'))
        : getDatamodel(org, app, modelPath)
    ),
  );
}
