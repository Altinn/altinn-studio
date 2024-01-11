import { useQuery } from '@tanstack/react-query';
import type { JSONSchema7 } from 'json-schema';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useDataModelSchemaQuery = () => {
  const { fetchDataModelSchema } = useAppQueries();
  const dataModelName = useCurrentDataModelName();
  const enabled = !!dataModelName;

  const utils = useQuery({
    enabled,
    queryKey: ['fetchDataModelSchemas', dataModelName],
    queryFn: () => fetchDataModelSchema(dataModelName!),
    onError: (error: HttpClientError) => {
      if (error.status === 404) {
        window.logWarn('Data model schema not found:\n', error);
      } else {
        window.logError('Data model schema request failed:\n', error);
      }
    },
  });

  return {
    ...utils,
    enabled,
  };
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext<JSONSchema7 | undefined, false>({
    name: 'DataModelSchema',
    required: false,
    default: undefined,
    query: useDataModelSchemaQuery,
  }),
);

export const DataModelSchemaProvider = Provider;
export const useCurrentDataModelSchema = () => useCtx();
