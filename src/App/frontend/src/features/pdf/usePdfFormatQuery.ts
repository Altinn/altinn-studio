import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { type QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import { useCurrentDataModelDataElementId } from 'src/features/datamodel/useBindingSchema';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import type { IPdfFormat } from 'src/features/pdf/types';

// Also used for prefetching @see formPrefetcher.ts
export function usePdfFormatQueryDef(
  enabled: boolean,
  instanceId?: string,
  dataElementId?: string,
): QueryDefinition<IPdfFormat> {
  const { fetchPdfFormat } = useAppQueries();
  return {
    queryKey: ['fetchPdfFormat', { instanceId, dataElementId }],
    queryFn: instanceId && dataElementId ? () => fetchPdfFormat(instanceId, dataElementId) : skipToken,
    enabled: enabled && !!instanceId && !!dataElementId,
    gcTime: 0,
  };
}

/**
 * This exists to suport the legacy IPdfFormatter interface which was used with the old PDF generator to make it easier to migrate from the old one.
 * The IPdfFormatter interface is marked as obsolete in app-lib v8+ and can therefore be considered to be deprecated in frontend v4 as well.
 * For some reason, the API requires the dataElementId of the data element for the current task instead of the task id. This therefore uses the default data model (from layout-sets),
 * and does not care about any additional data models.
 * @deprecated should be removed in the next major version
 */
export const usePdfFormatQuery = (enabled: boolean): UseQueryResult<IPdfFormat> => {
  const instanceId = useLaxInstanceId();
  const dataElementId = useCurrentDataModelDataElementId();

  const ready = typeof dataElementId === 'string';
  const utils = useQuery(usePdfFormatQueryDef(enabled && ready, instanceId, dataElementId));

  useEffect(() => {
    utils.error && window.logError('Fetching PDF format failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};
