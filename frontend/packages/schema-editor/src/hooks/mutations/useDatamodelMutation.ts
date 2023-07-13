import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { buildJsonSchema } from '@altinn/schema-model';
import { useParams } from 'react-router-dom';
import { useContext } from 'react';
import { SchemaEditorAppContext } from '@altinn/schema-editor/SchemaEditorAppContext';

export const useDatamodelMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useParams<{ org: string; app: string }>();
  const { modelPath } = useContext(SchemaEditorAppContext);
  const { saveDatamodel } = useServicesContext();
  return useMutation({
    mutationFn: (payload: UiSchemaNodes) => saveDatamodel(org, app, modelPath, buildJsonSchema(payload)).then(() => payload),
    onSuccess: (payload: UiSchemaNodes) => {
      queryClient.setQueryData(
        [QueryKey.Datamodel, org, app, modelPath],
        () => payload
      );
    }
  });
}
