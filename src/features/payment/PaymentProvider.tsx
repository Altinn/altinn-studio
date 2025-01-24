import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { AxiosError } from 'axios';

import { Loader } from 'src/core/loading/Loader';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { usePerformPayActionMutation } from 'src/features/payment/usePerformPaymentMutation';
import { useIsPayment } from 'src/features/payment/utils';
import { useIsSubformPage, useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useIsPdf } from 'src/hooks/useIsPdf';

type PaymentContextProps = {
  setLoading: (bool) => void;
  performPayment: () => void;
  paymentError: AxiosError | null;
};

type PaymentContextProvider = {
  children: ReactNode;
};

export const PaymentContext = createContext<PaymentContextProps | undefined>(undefined);

export const PaymentProvider: React.FC<PaymentContextProvider> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const partyId = useNavigationParam('partyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const { mutate, error } = usePerformPayActionMutation(partyId, instanceGuid);
  const isSubformPage = useIsSubformPage();

  const contextValue: PaymentContextProps = useMemo(
    () => ({
      setLoading,
      performPayment: () => {
        setLoading(true);
        mutate();
      },
      paymentError: error,
    }),
    [setLoading, mutate, error],
  );

  // If payment failed, stop loading
  React.useEffect(() => {
    if (error) {
      setLoading(false);
    }
  }, [error]);

  if (loading) {
    return <Loader reason='Navigating to external payment solution' />;
  }

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
      {!isSubformPage && !error && <PaymentNavigation />}
    </PaymentContext.Provider>
  );
};

function PaymentNavigation() {
  const { next, busy } = useProcessNavigation() || {};
  const paymentInfo = usePaymentInformation();
  const isPdf = useIsPdf();
  const { setLoading, performPayment } = usePayment();

  const paymentDoesNotExist = paymentInfo?.status === PaymentStatus.Uninitialized;
  const isPaymentProcess = useIsPayment();
  const actionCalled = useRef(false);

  // If when landing on payment task, PaymentStatus is Uninitialized, initiate it by calling the pay action and
  // go to payment provider
  useEffect(() => {
    if (isPaymentProcess && paymentDoesNotExist && !actionCalled.current && !isPdf) {
      actionCalled.current = true;
      setLoading(true);
      performPayment();
    }
  }, [isPaymentProcess, paymentDoesNotExist, performPayment, setLoading, isPdf]);

  const paymentCompleted = paymentInfo?.status === PaymentStatus.Paid || paymentInfo?.status === PaymentStatus.Skipped;
  const nextCalled = useRef(false);

  // If when landing on payment task, PaymentStatus is Paid or Skipped, go to next task
  useEffect(() => {
    if (paymentCompleted && next && !busy && !nextCalled.current && !isPdf) {
      nextCalled.current = true;
      setLoading(true);
      next({ action: 'confirm', nodeId: 'next-button' });
    }
  }, [paymentCompleted, setLoading, next, busy, isPdf]);

  return null;
}

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
