import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { findModelPath } from '../utils/dataModelUtils';

export type DataModel = {
  dataType: string;
  modelPath: string;
  schema: JsonSchema;
};

export type DataModelQueryResult = {
  /** Undefined when the layout set has no data model. */
  dataModel?: DataModel;
  isPending: boolean;
};

// Uses the same query keys as the data model editor, so the two share the cache.
export const useDataModelQuery = (
  org: string,
  app: string,
  dataType: string | undefined,
): DataModelQueryResult => {
  const { getDataModelsJson, getDataModel } = useServicesContext();

  const { data: dataModels, isPending: dataModelsPending } = useQuery<DataModelMetadataJson[]>({
    queryKey: [QueryKey.DataModelsJson, org, app],
    queryFn: () => getDataModelsJson(org, app),
  });
  const modelPath = findModelPath(dataModels, dataType);

  const { data: schema, isPending: schemaPending } = useQuery<JsonSchema>({
    queryKey: [QueryKey.JsonSchema, org, app, modelPath],
    queryFn: () => getDataModel(org, app, modelPath),
    enabled: Boolean(modelPath),
    structuralSharing: false,
  });

  const isPending = dataModelsPending || (Boolean(modelPath) && schemaPending);
  const dataModel = modelPath && schema ? { dataType, modelPath, schema } : undefined;
  return { dataModel, isPending };
};
