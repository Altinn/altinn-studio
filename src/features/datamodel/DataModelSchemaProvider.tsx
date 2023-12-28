import { useQuery } from '@tanstack/react-query';
import type { JSONSchema7 } from 'json-schema';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { DataModelActions } from 'src/features/datamodel/datamodelSlice';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export interface IDataModelSchemaContext {
  dataModelSchema: JSONSchema7;
  dataModelName: string;
}

const useDataModelSchemaQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchDataModelSchema } = useAppQueries();
  const dataModelName = useCurrentDataModelName();
  const enabled = !!dataModelName;

  const utils = useQuery({
    enabled,
    queryKey: ['fetchDataModelSchemas', dataModelName],
    queryFn: async () => {
      const schema = await fetchDataModelSchema(dataModelName!);
      const out: IDataModelSchemaContext = {
        dataModelSchema: schema,
        dataModelName: dataModelName!,
      };

      return out;
    },
    onSuccess: (result) => {
      dispatch(DataModelActions.fetchFulfilled({ id: dataModelName || '', schema: result.dataModelSchema }));
    },
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
  createQueryContext<IDataModelSchemaContext | undefined, false>({
    name: 'DataModelSchema',
    required: false,
    default: undefined,
    query: useDataModelSchemaQuery,
  }),
);

export const DataModelSchemaProvider = Provider;
export const useCurrentDataModelSchema = () => useCtx()?.dataModelSchema;
