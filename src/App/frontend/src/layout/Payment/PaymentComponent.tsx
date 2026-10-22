import React, { useCallback } from 'react';

import { Button } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Alert } from '@digdir/designsystemet-react';

import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useOptimisticallyUpdateProcess, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePaymentInformation, useRefetchPaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { usePayment } from 'src/features/payment/PaymentProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { getPaymentActions, isRefusedOnlyForPaymentStatus } from 'src/features/payment/utils';
import { useIsSubformPage } from 'src/hooks/navigation';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { usePollingWithBackoff } from 'src/hooks/usePollingWithBackoff';
import { useIsAnyProcessing } from 'src/hooks/useProcessingMutation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { TaskKeys } from 'src/routesBuilder';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { BackendValidationIssue } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';

export const PaymentComponent = ({ baseComponentId }: PropsFromGenericComponent<'Payment'>) => {
  const { langAsString } = useLanguage();
  const refetchPaymentInformation = useRefetchPaymentInformation();
  // A transition refused because of the payment status means the status shown is out of date, so show the current one
  const handlePaymentStatusIssues = async (validationIssues: BackendValidationIssue[]) => {
    await refetchPaymentInformation();
    return isRefusedOnlyForPaymentStatus(validationIssues);
  };
  const { mutate: processConfirm, isPending: isConfirming } = useProcessNext({
    action: 'confirm',
    handleValidationIssues: handlePaymentStatusIssues,
  });
  const { mutate: processReject, isPending: isRejecting } = useProcessNext({
    action: 'reject',
    handleValidationIssues: handlePaymentStatusIssues,
  });
  const isAnyProcessing = useIsAnyProcessing();
  const paymentInfo = usePaymentInformation();
  const { performPayment, paymentError } = usePayment();
  const { canGoNext, canPayOrGoBack, isProcessing } = getPaymentActions(paymentInfo?.status, !!paymentError);
  const config = useComponentConfig(baseComponentId, 'Payment');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Payment.textResourceBindings.title);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Payment.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Payment.textResourceBindings.help);

  const { data: process, refetch: reFetchProcessData } = useProcessQuery();
  const navigateToTask = useNavigateToTask();
  const optimisticallyUpdateProcess = useOptimisticallyUpdateProcess();
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;
  if (useIsSubformPage()) {
    throw new Error('Cannot use PaymentComponent in a subform');
  }
  const disabled = isAnyProcessing || isConfirming || isRejecting;
  const navigateBasedOnProcess = useCallback(
    async (shouldConfirmIfNoNavigate: boolean) => {
      if (!(paymentInfo?.status === PaymentStatus.Paid || paymentInfo?.status === PaymentStatus.Skipped)) {
        return;
      }
      const result = await reFetchProcessData();
      if (!result.data) {
        return;
      }
      let navigateTo: undefined | string;
      if (result.data.ended) {
        navigateTo = TaskKeys.ProcessEnd;
      } else if (
        result.data.currentTask?.elementId &&
        result.data.currentTask.elementId !== process?.currentTask?.elementId
      ) {
        navigateTo = result.data.currentTask.elementId;
      }
      if (navigateTo) {
        optimisticallyUpdateProcess(result.data);
        await reFetchInstanceData();
        navigateToTask(navigateTo);
      } else if (shouldConfirmIfNoNavigate) {
        processConfirm();
      }
    },
    [
      reFetchProcessData,
      paymentInfo?.status,
      process?.currentTask?.elementId,
      optimisticallyUpdateProcess,
      reFetchInstanceData,
      navigateToTask,
      processConfirm,
    ],
  );
  const handleNextClick = async () => {
    await navigateBasedOnProcess(true);
  };
  const pollPaymentAndProcess = useCallback(async () => {
    // The payment processor has accepted the payment, so wait for it to be charged
    if (isProcessing) {
      await refetchPaymentInformation();
      return;
    }
    await navigateBasedOnProcess(false);
  }, [isProcessing, refetchPaymentInformation, navigateBasedOnProcess]);
  usePollingWithBackoff(pollPaymentAndProcess);
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
          {(paymentInfo?.status === PaymentStatus.Failed || paymentError) && (
            <Alert data-color='warning'>
              <Lang id='payment.alert.failed' />
            </Alert>
          )}
          {paymentInfo?.status === PaymentStatus.Paid && (
            <Alert data-color='info'>
              <Lang id='payment.alert.paid' />
            </Alert>
          )}
          {isProcessing && (
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
          {canGoNext && (
            <Button
              variant='secondary'
              disabled={disabled}
              isLoading={isConfirming}
              loadingLabel={langAsString('general.loading')}
              onClick={handleNextClick}
            >
              <Lang id='general.next' />
            </Button>
          )}
        </div>
      </div>
    </ComponentStructureWrapper>
  );
};
