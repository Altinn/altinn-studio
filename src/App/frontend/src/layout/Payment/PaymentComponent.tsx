import React, { useCallback } from 'react';

import { Alert } from '@digdir/designsystemet-react';

import { Button } from 'src/app-components/Button/Button';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useOptimisticallyUpdateProcess, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { usePaymentInformation } from 'src/features/payment/PaymentInformationProvider';
import { usePayment } from 'src/features/payment/PaymentProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { useBackoff } from 'src/features/process/feedback/Feedback';
import { useIsSubformPage } from 'src/hooks/navigation';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { useIsAnyProcessing } from 'src/hooks/useProcessingMutation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Payment/PaymentComponent.module.css';
import { PaymentDetailsTable } from 'src/layout/PaymentDetails/PaymentDetailsTable';
import { TaskKeys } from 'src/routesBuilder';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const PaymentComponent = ({ baseComponentId }: PropsFromGenericComponent<'Payment'>) => {
  const { mutate: processConfirm, isPending: isConfirming } = useProcessNext({ action: 'confirm' });
  const { mutate: processReject, isPending: isRejecting } = useProcessNext({ action: 'reject' });
  const isAnyProcessing = useIsAnyProcessing();
  const paymentInfo = usePaymentInformation();
  const { performPayment, paymentError } = usePayment();
  const { title, description } = useItemWhenType(baseComponentId, 'Payment').textResourceBindings ?? {};
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

  const goToCurrentTask = useCallback(async () => {
    await navigateBasedOnProcess(false);
  }, [navigateBasedOnProcess]);

  useBackoff(goToCurrentTask);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <div className={classes.paymentContainer}>
        <PaymentDetailsTable
          orderDetails={paymentInfo?.orderDetails}
          tableTitle={title}
          description={description}
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
        </div>
        <div className={classes.buttonContainer}>
          {(paymentInfo?.status === PaymentStatus.Created || paymentError) && (
            <>
              <Button
                variant='secondary'
                disabled={disabled}
                isLoading={isRejecting}
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
          {(paymentInfo?.status === PaymentStatus.Paid || paymentInfo?.status === PaymentStatus.Skipped) && (
            <Button
              variant='secondary'
              disabled={disabled}
              isLoading={isConfirming}
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
