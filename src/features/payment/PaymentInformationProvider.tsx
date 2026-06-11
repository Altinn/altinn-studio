import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPayment } from 'src/features/payment/utils';
import { appSupportsPaymentWebhooks } from 'src/utils/versioning/versions';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { PaymentResponsePayload } from 'src/features/payment/types';

// Also used for prefetching @see formPrefetcher.ts
export function usePaymentInformationQueryDef(
  enabled: boolean,
  instanceId?: string,
): QueryDefinition<PaymentResponsePayload> {
  const { fetchPaymentInformationForTask, fetchPaymentInformation } = useAppQueries();
  const altinnNugetVersion = useApplicationMetadata().altinnNugetVersion;
  const { data: process } = useProcessQuery();
  const taskId = process?.currentTask?.elementId;

  const selectedLanguage = useCurrentLanguage();

  // Returning from the hosted payment page races with the payment webhook that advances the process.
  // The endpoint can briefly fail (e.g. while the data element is momentarily locked, or a transient
  // 5xx/network blip) — retry a few times so a single bad response doesn't strand the user on the
  // error page before the backend has settled. Mirrors the instance-data query's retry policy.
  if (appSupportsPaymentWebhooks(altinnNugetVersion)) {
    return {
      queryKey: ['fetchPaymentInfoForTask', instanceId, selectedLanguage],
      queryFn: instanceId ? () => fetchPaymentInformationForTask(instanceId, selectedLanguage, taskId) : skipToken,
      enabled: enabled && !!instanceId,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    };
  } else {
    return {
      queryKey: ['fetchPaymentInfo'],
      queryFn: instanceId ? () => fetchPaymentInformation(instanceId, selectedLanguage) : skipToken,
      enabled: enabled && !!instanceId,
      gcTime: 0,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    };
  }
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
