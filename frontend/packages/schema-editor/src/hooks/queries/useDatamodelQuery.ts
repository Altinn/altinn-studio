import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { buildUiSchema } from '@altinn/schema-model';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';

// TODO: Refactor the schema editor to accept the datamodel as an input. This data is already fetched in the app-development package.
export const useDatamodelQuery = (): UseQueryResult<UiSchemaNodes | null, AxiosError> => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { modelPath } = useSchemaEditorAppContext();
  const { getDatamodel } = useServicesContext();
  const queryClient = useQueryClient();
  return useQuery<UiSchemaNodes | null, AxiosError>(
    [QueryKey.Datamodel, org, app, modelPath],
    async () => {
        const schema: JsonSchema = await getDatamodel(org, app, modelPath);
        await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
        return buildUiSchema(schema);
    },
  );
}
