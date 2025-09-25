import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPayment } from 'src/features/payment/utils';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { PaymentResponsePayload } from 'src/features/payment/types';

// Also used for prefetching @see formPrefetcher.ts
export function usePaymentInformationQueryDef(
  enabled: boolean,
  instanceId?: string,
): QueryDefinition<PaymentResponsePayload> {
  const { fetchPaymentInformation } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();
  return {
    queryKey: ['fetchPaymentInfo'],
    queryFn: instanceId ? () => fetchPaymentInformation(instanceId, selectedLanguage) : skipToken,
    enabled: enabled && !!instanceId,
    gcTime: 0,
  };
}

const usePaymentInformationQuery = () => {
  const instanceId = useLaxInstanceId();
  const enabled = useIsPayment();

  const result = useQuery(usePaymentInformationQueryDef(enabled, instanceId));

  useEffect(() => {
    result.error && window.logError('Fetching paymentInfo failed:\n', result.error);
  }, [result.error]);

  return {
    ...result,
    enabled,
  };
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext<PaymentResponsePayload | undefined, false>({
    name: 'PaymentInfo',
    required: false,
    default: undefined,
    query: usePaymentInformationQuery,
  }),
);

export const PaymentInformationProvider = Provider;
export const usePaymentInformation = () => useCtx();
