import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { buildUiSchema } from '@altinn/schema-model';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useSelectedSchemaContext } from '@altinn/schema-editor/hooks/useSelectedSchemaContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';

export const useDatamodelQuery = (): UseQueryResult<UiSchemaNodes | null, AxiosError> => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { modelPath } = useSelectedSchemaContext();
  const { getDatamodel } = useServicesContext();
  const queryClient = useQueryClient();
  return useQuery<UiSchemaNodes | null, AxiosError>(
    [QueryKey.Datamodel, org, app, modelPath],
    async () => {
      if (!modelPath) return Promise.resolve(null);
      else {
        const schema: JsonSchema = await getDatamodel(org, app, modelPath);
        await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
        return buildUiSchema(schema);
      }
    },
  );
}
