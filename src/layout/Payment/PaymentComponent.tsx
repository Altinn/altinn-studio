import React, { useEffect, useRef } from 'react';

import { Alert, Button } from '@digdir/designsystemet-react';

import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { usePerformPayActionMutation } from 'src/features/payment/usePerformPaymentMutation';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { SkeletonLoader } from 'src/layout/Payment/SkeletonLoader';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const PaymentComponent = ({ node }: PropsFromGenericComponent<'Payment'>) => {
  const partyId = useNavigationParam('partyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const { next, busy } = useProcessNavigation() || {};
  const paymentInfo = usePaymentInformation();
  const { mutate: performPayment } = usePerformPayActionMutation(partyId, instanceGuid);
  const paymentDoesNotExist = paymentInfo?.status === PaymentStatus.Uninitialized;
  const { title, description } = useNodeItem(node, (i) => i.textResourceBindings) ?? {};
  const actionCalled = useRef(false);
  const nextCalled = useRef(false);

  useEffect(() => {
    // if no paymentDetails exists, the payment has not been initiated, initiate it by calling the pay action
    if (paymentDoesNotExist && !actionCalled.current) {
      actionCalled.current = true;
      performPayment();
    }
  }, [paymentDoesNotExist, performPayment]);

  useEffect(() => {
    if (
      (paymentInfo?.status === PaymentStatus.Paid || paymentInfo?.status === PaymentStatus.Skipped) &&
      next &&
      !nextCalled.current
    ) {
      nextCalled.current = true;
      next({ action: 'confirm', nodeId: 'next-button' });
    }
  }, [paymentInfo, next]);

  if (busy || paymentDoesNotExist) {
    return <SkeletonLoader />;
  }

  return (
    <ComponentStructureWrapper node={node}>
      <PaymentDetailsTable
        orderDetails={paymentInfo?.orderDetails}
        tableTitle={title}
        description={description}
      />
      <div>
        {paymentInfo?.status === PaymentStatus.Failed && (
          <Alert severity='warning'>
            <Lang id='payment.alert.failed' />
          </Alert>
        )}
        {paymentInfo?.status === PaymentStatus.Paid && (
          <Alert severity={'info'}>
            <Lang id='payment.alert.paid' />
          </Alert>
        )}
      </div>
      <div className={classes.buttonContainer}>
        {paymentInfo?.status === PaymentStatus.Created && (
          <>
            <Button
              variant='secondary'
              onClick={() => next && next({ action: 'reject', nodeId: 'reject-button' })}
            >
              <Lang id='general.back' />
            </Button>
            <Button
              color='success'
              onClick={() => performPayment()}
            >
              <Lang id='payment.pay' />
            </Button>
          </>
        )}
        {paymentInfo?.status === PaymentStatus.Paid && (
          <Button
            variant='secondary'
            onClick={() => next && next({ action: 'confirm', nodeId: 'next-button' })}
          >
            <Lang id='general.next' />
          </Button>
        )}
      </div>
    </ComponentStructureWrapper>
  );
};
