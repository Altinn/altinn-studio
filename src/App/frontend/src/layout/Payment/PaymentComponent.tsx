import { toast } from 'react-toastify';

import { Button } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Alert } from '@digdir/designsystemet-react';
import { isHttpError } from '@studio/http-client';

import { useCancelPaymentMutation, usePaymentInformation } from 'src/core/queries/payment';
import { useIsAnyProcessing } from 'src/core/queries/processing';
import { useIsAwaitingMessages } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePayment } from 'src/features/payment/PaymentProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { useProcessNext, useRefreshProcess } from 'src/features/process/useProcessNext';
import { useIsSubformPage } from 'src/hooks/navigation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const PaymentComponent = ({ baseComponentId }: PropsFromGenericComponent<'Payment'>) => {
  const { langAsString } = useLanguage();
  const { mutate: processReject, isPending: isRejecting } = useProcessNext({ action: 'reject' });
  const { mutateAsync: cancelPayment, isPending: isCancelling } = useCancelPaymentMutation();
  const refreshProcess = useRefreshProcess();
  const isAnyProcessing = useIsAnyProcessing();
  const paymentInfo = usePaymentInformation();
  const { performPayment, paymentError } = usePayment();
  const isAwaitingMessages = useIsAwaitingMessages();
  const config = useComponentConfig(baseComponentId, 'Payment');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Payment.textResourceBindings.title);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Payment.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Payment.textResourceBindings.help);

  if (useIsSubformPage()) {
    throw new Error('Cannot use PaymentComponent in a subform');
  }

  const status = paymentInfo?.status;
  const isPaid = status === PaymentStatus.Paid || status === PaymentStatus.Skipped;
  const isAuthorized = status === PaymentStatus.Authorized;
  const checkoutUrl = paymentInfo?.paymentDetails?.redirectUrl;
  const canContinueOrCancel = isAwaitingMessages && status === PaymentStatus.Created;
  const canPayOrGoBack =
    !isAwaitingMessages &&
    (status === PaymentStatus.Created ||
      status === PaymentStatus.Cancelled ||
      status === PaymentStatus.Failed ||
      (!!paymentError && !isPaid && !isAuthorized));
  const disabled = isAnyProcessing || isRejecting || isCancelling;

  // Every answer, a refusal too, can come after the attempt moved the process or let the instance go
  const handleCancelClick = async () => {
    const error = await cancelPayment().then(
      () => undefined,
      (error: unknown) => error,
    );
    await refreshProcess();
    if (error && !isCancelOutcomeShownByPage(error)) {
      toast(<Lang id='payment.cancel_failed' />, { type: 'error', autoClose: false });
    }
  };

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <div className={classes.paymentContainer}>
        <PaymentDetailsTable
          orderDetails={paymentInfo?.orderDetails}
          tableTitle={title}
          description={description}
          help={help}
        />
        <div className={classes.alertContainer}>
          {(status === PaymentStatus.Failed || paymentError) && (
            <Alert data-color='warning'>
              <Lang id='payment.alert.failed' />
            </Alert>
          )}
          {status === PaymentStatus.Paid && (
            <Alert data-color='info'>
              <Lang id='payment.alert.paid' />
            </Alert>
          )}
          {isAuthorized && (
            <Alert data-color='info'>
              <Lang id='payment.alert.processing' />
            </Alert>
          )}
        </div>
        <div className={classes.buttonContainer}>
          {canPayOrGoBack && (
            <>
              <Button
                variant='secondary'
                disabled={disabled}
                isLoading={isRejecting}
                loadingLabel={langAsString('general.loading')}
                onClick={() => processReject()}
              >
                <Lang id='general.back' />
              </Button>
              <Button
                color='success'
                onClick={performPayment}
              >
                <Lang id='payment.pay' />
              </Button>
            </>
          )}
          {canContinueOrCancel && (
            <>
              <Button
                variant='secondary'
                disabled={disabled}
                isLoading={isCancelling}
                loadingLabel={langAsString('general.loading')}
                onClick={handleCancelClick}
              >
                <Lang id='general.back' />
              </Button>
              {checkoutUrl && (
                <Button
                  color='success'
                  disabled={disabled}
                  onClick={() => window.location.assign(checkoutUrl)}
                >
                  <Lang id='payment.continue' />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </ComponentStructureWrapper>
  );
};

/**
 * The attempt has ended, has failed, is still handling the cancel, or holds a reserved payment, which the processing
 * alert explains. The refreshed process and its poll show where that leaves the user, so trying Back again would not
 * help.
 */
function isCancelOutcomeShownByPage(error: unknown): boolean {
  if (!isHttpError<{ type?: string; processNextState?: string } | undefined>(error)) {
    return false;
  }
  const status = error.response?.status;
  const { type, processNextState } = error.response?.data ?? {};
  return (
    status === 400 ||
    status === 504 ||
    type === 'payment-attempt-not-open' ||
    type === 'payment-authorized' ||
    processNextState !== undefined
  );
}
