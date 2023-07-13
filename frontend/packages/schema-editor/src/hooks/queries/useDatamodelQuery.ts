import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { buildUiSchema } from '@altinn/schema-model';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { SchemaEditorAppContext } from '@altinn/schema-editor/SchemaEditorAppContext';
import { useContext } from 'react';
import { AxiosError } from 'axios';

export const useDatamodelQuery = (): UseQueryResult<UiSchemaNodes | null, AxiosError> => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { modelPath } = useContext(SchemaEditorAppContext);
  const { getDatamodel } = useServicesContext();
  return useQuery<UiSchemaNodes | null, AxiosError>(
    [QueryKey.Datamodel, org, app, modelPath],
    () => {
      if (!modelPath) return Promise.resolve(null);
      else return getDatamodel(org, app, modelPath).then(buildUiSchema);
    },
  );
}
