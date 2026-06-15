import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPayment } from 'src/features/payment/utils';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { PaymentResponsePayload } from 'src/features/payment/types';

export function usePaymentInformationQueryDef(
  enabled: boolean,
  instanceId?: string,
): QueryDefinition<PaymentResponsePayload> {
  const { fetchPaymentInformationForTask } = useAppQueries();
  const { data: process } = useProcessQuery();
  const taskId = process?.currentTask?.elementId;

  const selectedLanguage = useCurrentLanguage();

  return {
    queryKey: ['fetchPaymentInfoForTask', instanceId, selectedLanguage],
    queryFn: instanceId ? () => fetchPaymentInformationForTask(instanceId, selectedLanguage, taskId) : skipToken,
    enabled: enabled && !!instanceId,
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
