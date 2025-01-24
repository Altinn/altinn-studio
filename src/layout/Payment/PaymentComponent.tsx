import React from 'react';

import { Alert, Button } from '@digdir/designsystemet-react';

import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { usePayment } from 'src/features/payment/PaymentProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const PaymentComponent = ({ node }: PropsFromGenericComponent<'Payment'>) => {
  const { next, busy } = useProcessNavigation() || {};
  const paymentInfo = usePaymentInformation();
  const { performPayment, paymentError, setLoading } = usePayment();
  const { title, description } = useNodeItem(node, (i) => i.textResourceBindings) ?? {};

  if (busy && !paymentError) {
    setLoading(true);
  }

  return (
    <ComponentStructureWrapper node={node}>
      <div className={classes.paymentContainer}>
        <PaymentDetailsTable
          orderDetails={paymentInfo?.orderDetails}
          tableTitle={title}
          description={description}
        />
        <div className={classes.alertContainer}>
          {(paymentInfo?.status === PaymentStatus.Failed || paymentError) && (
            <Alert severity='warning'>
              <Lang id='payment.alert.failed' />
            </Alert>
          )}
          {paymentInfo?.status === PaymentStatus.Paid && (
            <Alert severity='info'>
              <Lang id='payment.alert.paid' />
            </Alert>
          )}
        </div>
        <div className={classes.buttonContainer}>
          {(paymentInfo?.status === PaymentStatus.Created || paymentError) && (
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
      </div>
    </ComponentStructureWrapper>
  );
};
