import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { resolveExpressionValidationConfig } from 'src/features/customValidation/customValidationUtils';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IExpressionValidationConfig } from 'src/features/validation';

// Also used for prefetching @see formPrefetcher.ts
export function useCustomValidationConfigQueryDef(
  enabled: boolean,
  dataTypeId?: string,
): QueryDefinition<IExpressionValidationConfig | null> {
  const { fetchCustomValidationConfig } = useAppQueries();
  return {
    queryKey: ['fetchCustomValidationConfig', dataTypeId],
    queryFn: dataTypeId ? () => fetchCustomValidationConfig(dataTypeId) : skipToken,
    enabled: enabled && !!dataTypeId,
  };
}

export const useCustomValidationConfigQuery = (enabled: boolean, dataTypeId: string) => {
  const queryDef = useCustomValidationConfigQueryDef(enabled, dataTypeId);
  const utils = useQuery({
    ...queryDef,
    select: (config) => (config ? resolveExpressionValidationConfig(config) : null),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching validation configuration failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    enabled: queryDef.enabled,
  };
};
