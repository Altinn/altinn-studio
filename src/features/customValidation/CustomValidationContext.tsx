import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { resolveExpressionValidationConfig } from 'src/features/validation/frontend/expressionValidation';
import type { IExpressionValidationConfig, IExpressionValidations } from 'src/features/validation';

const useCustomValidationConfigQuery = () => {
  const { fetchCustomValidationConfig } = useAppQueries();
  const dataTypeId = useCurrentDataModelName();
  const enabled = Boolean(dataTypeId?.length);

  const utils = useQuery({
    enabled,
    queryKey: ['fetchCustomValidationConfig', dataTypeId],
    queryFn: () => fetchCustomValidationConfig(dataTypeId!),
    onError: (error: AxiosError) => {
      window.logError('Fetching validation configuration failed:\n', error);
    },
  });

  return {
    ...utils,
    enabled,
  };
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext<IExpressionValidationConfig | null, false, IExpressionValidations | null>({
    name: 'CustomValidationContext',
    required: false,
    default: null,
    query: useCustomValidationConfigQuery,
    process: (queryData) => (queryData ? resolveExpressionValidationConfig(queryData) : null),
  }),
);

export const CustomValidationConfigProvider = Provider;
export const useCustomValidationConfig = () => useCtx();
