import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { JsonSchema } from 'app-shared/types/JsonSchema';

export const useSchemaQuery = (modelPath: string): UseQueryResult<JsonSchema | null, AxiosError> => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { getDatamodel } = useServicesContext();
  return useQuery<JsonSchema | null, AxiosError>(
    [QueryKey.JsonSchema, org, app, modelPath],
    async () => getDatamodel(org, app, modelPath),
  );
}
