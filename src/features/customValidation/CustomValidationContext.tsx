import React from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { CustomValidationActions } from 'src/features/customValidation/customValidationSlice';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { Loader } from 'src/features/loading/Loader';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { createStrictContext } from 'src/utils/createContext';
import { resolveExpressionValidationConfig } from 'src/utils/validation/expressionValidation';
import type { IExpressionValidationConfig } from 'src/utils/validation/types';

const { Provider, useCtx } = createStrictContext<IExpressionValidationConfig | null>({
  name: 'CustomValidationContext',
});

const useCustomValidationConfigQuery = (
  dataTypeId: string | undefined,
): UseQueryResult<IExpressionValidationConfig | null> => {
  const dispatch = useAppDispatch();
  const { fetchCustomValidationConfig } = useAppQueries();

  return useQuery({
    queryKey: ['fetchCustomValidationConfig', dataTypeId],
    queryFn: () => fetchCustomValidationConfig(dataTypeId!),
    enabled: Boolean(dataTypeId?.length),
    onSuccess: (customValidationConfig) => {
      if (customValidationConfig) {
        const validationDefinition = resolveExpressionValidationConfig(customValidationConfig);
        dispatch(CustomValidationActions.fetchCustomValidationsFulfilled(validationDefinition));
      } else {
        dispatch(CustomValidationActions.fetchCustomValidationsFulfilled(null));
      }
    },
    onError: (error: AxiosError) => {
      dispatch(CustomValidationActions.fetchCustomValidationsRejected(error));
      window.logError('Fetching validation configuration failed:\n', error);
    },
  });
};

export function CustomValidationConfigProvider({ children }: React.PropsWithChildren) {
  const dataTypeId = useCurrentDataModelName();
  const query = useCustomValidationConfigQuery(dataTypeId);

  if (dataTypeId?.length && (query.isLoading || query.data === undefined)) {
    return <Loader reason={'custom-validation-config'} />;
  }

  return <Provider value={query.data || null}>{children}</Provider>;
}

export const useCustomValidationConfig = () => useCtx();
