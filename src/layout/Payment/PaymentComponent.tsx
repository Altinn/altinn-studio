import React, { useEffect } from 'react';

import { Alert, Button } from '@digdir/designsystemet-react';

import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { PaymentStatus } from 'src/layout/Payment/queries/types';
import { usePaymentInformationQuery } from 'src/layout/Payment/queries/usePaymentInformationQuery';
import { usePerformPayActionMutation } from 'src/layout/Payment/queries/usePerformPaymentMutation';
import { SkeletonLoader } from 'src/layout/Payment/SkeletonLoader/SkeletonLoader';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';

export const PaymentComponent = ({ node }) => {
  const { partyId, instanceGuid } = useInstanceIdParams();
  const { next, busy } = useProcessNavigation() || {};
  const { data: paymentInfo, isFetched: isPaymentInformationFetched } = usePaymentInformationQuery(
    partyId,
    instanceGuid,
  );
  const performPayActionMutation = usePerformPayActionMutation(partyId, instanceGuid);
  const paymentDoesNotExist = isPaymentInformationFetched && !paymentInfo?.paymentDetails;
  const { title, description } = node.item.textResourceBindings;

  // performPayActionMutation changes each render, so we need to destructure it to get the mutate function
  // which does not change and is safe to use in the useEffect dependency array
  const { mutate: performPayment } = performPayActionMutation;

  useEffect(() => {
    // if no paymentDetails exists, the payment has not been initiated, initiate it by calling the pay action
    if (paymentDoesNotExist) {
      performPayment();
    }
  }, [performPayment, paymentDoesNotExist]);

  useEffect(() => {
    if (paymentInfo?.status === PaymentStatus.Paid) {
      next && next({ action: 'confirm', nodeId: 'next-button' });
    }
  }, [paymentInfo, next]);

  if (busy || !isPaymentInformationFetched || paymentDoesNotExist) {
    return <SkeletonLoader />;
  }

  return (
    <>
      {
        <PaymentDetailsTable
          orderDetails={paymentInfo?.orderDetails}
          tableTitle={title}
          description={description}
          className={classes.container}
        />
      }
      <div className={classes.container}>
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
    </>
  );
};
