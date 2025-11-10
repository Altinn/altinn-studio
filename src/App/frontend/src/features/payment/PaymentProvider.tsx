import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

import type { AxiosError } from 'axios';

import { Loader } from 'src/core/loading/Loader';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { usePerformPayActionMutation } from 'src/features/payment/usePerformPaymentMutation';
import { useIsPayment } from 'src/features/payment/utils';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { useShallowMemo } from 'src/hooks/useShallowMemo';

type PaymentContextProps = {
  performPayment: () => void;
  skipPayment: () => void;
  paymentError: AxiosError | null;
};

type PaymentContextProvider = {
  children: ReactNode;
};

export const PaymentContext = createContext<PaymentContextProps | undefined>(undefined);

// Module-level tracking to prevent duplicate payment calls across component remounts
const paymentInitiatedForInstance = new Map<string, boolean>();

export const PaymentProvider: React.FC<PaymentContextProvider> = ({ children }) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const {
    mutateAsync,
    error: paymentError,
    isPending: isPaymentPending,
  } = usePerformPayActionMutation(instanceOwnerPartyId, instanceGuid);
  const { mutateAsync: processConfirm, isPending: isConfirmPending } = useProcessNext({ action: 'confirm' });

  const isLoading = isPaymentPending || isConfirmPending;

  const performPayment = useOurEffectEvent(() => mutateAsync());
  const skipPayment = useOurEffectEvent(() => processConfirm());

  const contextValue = useShallowMemo({ performPayment, skipPayment, paymentError });

  return (
    <PaymentContext.Provider value={contextValue}>
      {isLoading ? <Loader reason='Navigating to external payment solution' /> : children}
      {!paymentError && <PaymentNavigation />}
    </PaymentContext.Provider>
  );
};

function PaymentNavigation() {
  const paymentInfo = usePaymentInformation();
  const isPdf = useIsPdf();
  const { performPayment, skipPayment } = usePayment();
  const instanceGuid = useNavigationParam('instanceGuid');

  const paymentDoesNotExist = paymentInfo?.status === PaymentStatus.Uninitialized;
  const isPaymentProcess = useIsPayment();

  // If when landing on payment task, PaymentStatus is Uninitialized, initiate it by calling the pay action and
  // go to payment provider
  useEffect(() => {
    if (isPaymentProcess && paymentDoesNotExist && !isPdf && instanceGuid) {
      // Check module-level map to prevent duplicate calls across remounts
      if (!paymentInitiatedForInstance.get(instanceGuid)) {
        paymentInitiatedForInstance.set(instanceGuid, true);
        performPayment();
      }
    } else if (
      instanceGuid &&
      paymentInfo?.status !== undefined &&
      paymentInfo.status !== PaymentStatus.Uninitialized
    ) {
      // Clean up the flag once payment status is known and no longer Uninitialized
      paymentInitiatedForInstance.delete(instanceGuid);
    }
  }, [isPaymentProcess, paymentDoesNotExist, performPayment, isPdf, instanceGuid, paymentInfo?.status]);

  const paymentCompleted = paymentInfo?.status === PaymentStatus.Paid || paymentInfo?.status === PaymentStatus.Skipped;

  // If when landing on payment task, PaymentStatus is Paid or Skipped, go to next task
  useEffect(() => {
    if (isPaymentProcess && paymentCompleted && !isPdf) {
      skipPayment();
    }
  }, [isPaymentProcess, paymentCompleted, skipPayment, isPdf]);

  return null;
}

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
