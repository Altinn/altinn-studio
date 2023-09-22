import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { JSONSchema7 } from 'json-schema';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { DataModelActions } from 'src/features/datamodel/datamodelSlice';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useCurrentDataModelSchemaQuery = (): UseQueryResult<JSONSchema7> => {
  const dispatch = useAppDispatch();
  const { fetchDataModelSchema } = useAppQueriesContext();
  const dataModelName = useCurrentDataModelName();
  return useQuery(['fetchDataModelSchemas', dataModelName], () => fetchDataModelSchema(dataModelName || ''), {
    enabled: !!dataModelName,
    onSuccess: (schema) => {
      dispatch(DataModelActions.fetchFulfilled({ id: dataModelName || '', schema }));
    },
    onError: (error: HttpClientError) => {
      if (error.status === 404) {
        dispatch(DataModelActions.fetchRejected({ error: null }));
        window.logWarn('Data model schema not found:\n', error);
      } else {
        dispatch(DataModelActions.fetchRejected({ error }));
        window.logError('Data model schema request failed:\n', error);
      }
    },
  });
};
