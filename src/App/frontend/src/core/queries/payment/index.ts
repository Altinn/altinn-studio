import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HttpError } from '@studio/http-client';

import { useAppMutations } from 'src/core/queries/AppQueriesProvider';
import { mutationResult } from 'src/core/queries/mutationResult';
import {
  OrderDetailsProvider,
  useOrderDetails,
  useRefetchOrderDetails,
} from 'src/core/queries/payment/OrderDetailsProvider';
import { paymentQueryKeys } from 'src/core/queries/payment/payment.queries';
import {
  PaymentInformationProvider,
  usePaymentInformation,
  useRefetchPaymentInformation,
  useSetPaymentInformation,
} from 'src/core/queries/payment/PaymentInformationProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';

export const usePerformPayActionMutation = (partyId?: string, instanceGuid?: string) => {
  const queryClient = useQueryClient();
  const { doPerformAction } = useAppMutations();
  const selectedLanguage = useCurrentLanguage();
  const mutation = useMutation({
    mutationKey: ['performPayAction', partyId, instanceGuid],
    mutationFn: async () => {
      if (partyId && instanceGuid) {
        return await doPerformAction(partyId, instanceGuid, { action: 'pay' }, selectedLanguage);
      }
    },
    onError: (error: HttpError) => {
      window.logError('Error performing pay action', error);
      if (error.response?.status === 409) {
        // A payment attempt or a transition holds the instance, or it changed: reload to show its current state
        window.location.reload();
      }
    },
    onSuccess: (data) => {
      if (data?.redirectUrl) {
        window.location.assign(data.redirectUrl);
      } else {
        return queryClient.invalidateQueries({
          queryKey: paymentQueryKeys.informationForInstance(`${partyId}/${instanceGuid}`),
        });
      }
    },
  });
  return mutationResult(mutation);
};

/** Ends the open payment attempt: the process moves back, or on when the payment has gone through. */
export const useCancelPaymentMutation = () => {
  const instanceId = useLaxInstanceId();
  const { doCancelPayment } = useAppMutations();
  const selectedLanguage = useCurrentLanguage();
  const refetchPaymentInformation = useRefetchPaymentInformation();
  const mutation = useMutation({
    mutationFn: async () => {
      if (instanceId) {
        return await doCancelPayment(instanceId, selectedLanguage);
      }
    },
    // A cancel that went through moves the process or lets the instance go, and the page reads the payment again then
    onError: (error: HttpError) => {
      window.logError('Error cancelling payment', error);
      return refetchPaymentInformation();
    },
  });
  return mutationResult(mutation);
};

/** Asks the payment processor for the payment's status, and sends it to the open payment attempt when it changed. */
export const useCheckPaymentMutation = () => {
  const instanceId = useLaxInstanceId();
  const { doCheckPayment } = useAppMutations();
  const selectedLanguage = useCurrentLanguage();
  const mutation = useMutation({
    mutationFn: async () => {
      if (instanceId) {
        return await doCheckPayment(instanceId, selectedLanguage);
      }
    },
    onError: (error: HttpError) => window.logError('Error checking payment', error),
  });
  return mutationResult(mutation);
};

export {
  PaymentInformationProvider,
  usePaymentInformation,
  useRefetchPaymentInformation,
  useSetPaymentInformation,
  OrderDetailsProvider,
  useOrderDetails,
  useRefetchOrderDetails,
};
