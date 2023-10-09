import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { CustomValidationActions } from 'src/features/customValidation/customValidationSlice';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { resolveExpressionValidationConfig } from 'src/utils/validation/expressionValidation';
import type { IExpressionValidationConfig } from 'src/utils/validation/types';

export const useCustomValidationConfig = (): UseQueryResult<IExpressionValidationConfig | null> => {
  const dispatch = useAppDispatch();
  const { fetchCustomValidationConfig } = useAppQueries();
  const dataTypeId = useCurrentDataModelName();

  return useQuery(['fetchCustomValidationConfig', dataTypeId], () => fetchCustomValidationConfig(dataTypeId!), {
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
