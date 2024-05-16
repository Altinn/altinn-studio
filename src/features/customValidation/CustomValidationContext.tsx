import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { resolveExpressionValidationConfig } from 'src/features/customValidation/customValidationUtils';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IExpressionValidationConfig, IExpressionValidations } from 'src/features/validation';

// Also used for prefetching @see formPrefetcher.ts
export function useCustomValidationConfigQueryDef(
  dataTypeId?: string,
): QueryDefinition<IExpressionValidationConfig | null> {
  const { fetchCustomValidationConfig } = useAppQueries();
  return {
    queryKey: ['fetchCustomValidationConfig', dataTypeId],
    queryFn: dataTypeId ? () => fetchCustomValidationConfig(dataTypeId) : skipToken,
    enabled: !!dataTypeId,
  };
}

const useCustomValidationConfigQuery = () => {
  const dataTypeId = useCurrentDataModelName();

  const queryDef = useCustomValidationConfigQueryDef(dataTypeId);
  const utils = useQuery(queryDef);

  useEffect(() => {
    utils.error && window.logError('Fetching validation configuration failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    enabled: !!queryDef.enabled,
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
