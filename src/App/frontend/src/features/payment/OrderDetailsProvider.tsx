import { useCallback, useEffect } from 'react';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useHasPayment } from 'src/features/payment/utils';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { OrderDetails } from 'src/features/payment/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

// Also used for prefetching @see formPrefetcher.ts
export function useOrderDetailsQueryDef(enabled: boolean, instanceId?: string): QueryDefinition<OrderDetails> {
  const { fetchOrderDetails } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();
  return {
    queryKey: ['fetchOrderDetails'],
    queryFn: instanceId ? () => fetchOrderDetails(instanceId, selectedLanguage) : skipToken,
    enabled: enabled && !!instanceId,
  };
}

const useOrderDetailsQuery = () => {
  const instanceId = useLaxInstanceId();
  const enabled = useHasPayment();
  const utils = useQuery<OrderDetails, HttpClientError>(useOrderDetailsQueryDef(enabled, instanceId));

  useEffect(() => {
    utils.error && window.logError('Fetching orderDetails failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    enabled,
  };
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext<OrderDetails | undefined, false>({
    name: 'OrderDetails',
    required: false,
    default: undefined,
    query: useOrderDetailsQuery,
  }),
);

export const OrderDetailsProvider = Provider;
export const useOrderDetails = () => useCtx();
export const useRefetchOrderDetails = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['fetchOrderDetails'] });
  }, [queryClient]);
};
