import { createContext, useContext, useEffect } from 'react';
import type { FC, ReactNode } from 'react';

import { isHttpError } from '@studio/http-client';
import type { HttpError } from '@studio/http-client';

import { Loader } from 'src/core/loading/Loader';
import {
  useCheckPaymentMutation,
  usePaymentInformation,
  usePerformPayActionMutation,
  useSetPaymentInformation,
} from 'src/core/queries/payment';
import { usePollingWithBackoff } from 'src/core/queries/usePollingWithBackoff';
import { useIsAwaitingMessages } from 'src/features/instance/useProcessQuery';
import { PaymentStatus } from 'src/features/payment/types';
import { useIsPayment } from 'src/features/payment/utils';
import { useRefreshProcess } from 'src/features/process/useProcessNext';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { useShallowMemo } from 'src/hooks/useShallowMemo';

type PaymentContextProps = {
  performPayment: () => void;
  paymentError: HttpError | null;
};

type PaymentContextProvider = {
  children: ReactNode;
};

export const PaymentContext = createContext<PaymentContextProps | undefined>(undefined);

// Instances that this page load has called pay for, so a remount does not call it again
const paymentInitiatedForInstance = new Set<string>();

// Instances whose open payment attempt this page load has checked
const paymentCheckedForInstance = new Set<string>();

// A payment that went through, or no payment at all: pay adopts the payment or starts one, without asking the user
const statusesToPayOnLanding = [
  PaymentStatus.Uninitialized,
  PaymentStatus.Paid,
  PaymentStatus.Authorized,
  PaymentStatus.Skipped,
];

export const PaymentProvider: FC<PaymentContextProvider> = ({ children }) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const {
    mutateAsync,
    error: payError,
    isPending: isPaymentPending,
  } = usePerformPayActionMutation(instanceOwnerPartyId, instanceGuid);
  const refreshProcess = useRefreshProcess();
  const isAwaitingMessages = useIsAwaitingMessages();

  // A pay that failed after its attempt opened is stale: the open attempt is what the page shows and checks
  const paymentError = isAwaitingMessages ? null : payError;

  const isLoading = isPaymentPending;

  // Without a redirect, pay has moved the process on or opened an attempt on a reserved payment. A failure can also
  // come after the attempt opened or the process moved; a 409 reloads the page instead.
  const performPayment = useOurEffectEvent(async () => {
    const isRedirectOrReload = await mutateAsync().then(
      (result) => !!result?.redirectUrl,
      (error) => isHttpError(error) && error.response?.status === 409,
    );
    if (!isRedirectOrReload) {
      await refreshProcess();
    }
  });

  const contextValue = useShallowMemo({ performPayment, paymentError });

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
  const { performPayment } = usePayment();
  const instanceGuid = useNavigationParam('instanceGuid');
  const isAwaitingMessages = useIsAwaitingMessages();
  const { mutateAsync: checkPayment, isPending: isChecking } = useCheckPaymentMutation();
  const setPaymentInformation = useSetPaymentInformation();
  const refreshProcess = useRefreshProcess();

  const status = paymentInfo?.status;
  const shouldPay = status !== undefined && statusesToPayOnLanding.includes(status) && !isAwaitingMessages;
  const isPaymentProcess = useIsPayment();

  useEffect(() => {
    if (isPaymentProcess && shouldPay && !isPdf && instanceGuid) {
      if (!paymentInitiatedForInstance.has(instanceGuid)) {
        paymentInitiatedForInstance.add(instanceGuid);
        performPayment();
      }
    } else if (instanceGuid && status !== undefined) {
      // Clean up the flag once payment status is known and no longer one to pay for
      paymentInitiatedForInstance.delete(instanceGuid);
    }
  }, [isPaymentProcess, shouldPay, performPayment, isPdf, instanceGuid, status]);

  // Completes a payment that no webhook reported, such as in local development. A failed check changes nothing: the
  // page keeps showing the stored payment, and polling the process still follows the attempt.
  const checkOpenAttempt = useOurEffectEvent(async () => {
    if (isChecking) {
      return;
    }
    const checked = await checkPayment().catch(() => undefined);
    if (checked && checked.status !== status) {
      setPaymentInformation(checked);
      await refreshProcess();
    }
  });

  const canCheck = isPaymentProcess && isAwaitingMessages && !isPdf;
  useEffect(() => {
    if (canCheck && instanceGuid && !paymentCheckedForInstance.has(instanceGuid)) {
      paymentCheckedForInstance.add(instanceGuid);
      checkOpenAttempt();
    }
  }, [canCheck, instanceGuid, checkOpenAttempt]);

  // The payment processor charges a reserved payment some time after the reservation, and no webhook may report it
  usePollingWithBackoff(checkOpenAttempt, canCheck && status === PaymentStatus.Authorized);

  return null;
}

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
