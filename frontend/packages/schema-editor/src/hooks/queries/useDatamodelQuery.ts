import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { buildUiSchema } from '@altinn/schema-model';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useDatamodelQuery = (org: string, app: string, modelPath: string): UseQueryResult<UiSchemaNodes> => {
  const { getDatamodel } = useServicesContext();
  return useQuery<UiSchemaNodes>(
    [QueryKey.Datamodel, org, app, modelPath],
    () => getDatamodel(org, app, modelPath).then(buildUiSchema),
  );
}
