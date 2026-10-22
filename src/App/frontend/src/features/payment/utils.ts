import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { PaymentStatus } from 'src/features/payment/types';
import { BackendValidationSeverity } from 'src/features/validation';
import { ProcessTaskType } from 'src/types';
import type { BackendValidationIssue } from 'src/features/validation';

/**
 * Returns true if the app has payment configured
 */
export function useHasPayment(): boolean {
  const { data: process } = useProcessQuery();
  return !!process?.processTasks?.some((task) => task.altinnTaskType === ProcessTaskType.Payment);
}

/**
 * Returns true if the current task is a payment task
 */
export function useIsPayment(): boolean {
  const { data: process } = useProcessQuery();
  return process?.currentTask?.altinnTaskType === ProcessTaskType.Payment;
}

/**
 * What the payment component offers for a payment status. A payment that was not paid, or a failed pay action, lets
 * the user pay again or go back, unless the payment has gone through.
 */
export function getPaymentActions(status: PaymentStatus | undefined, hasPaymentError: boolean) {
  const canGoNext = status === PaymentStatus.Paid || status === PaymentStatus.Skipped;
  const isProcessing = status === PaymentStatus.Authorized;
  const canPayOrGoBack =
    status === PaymentStatus.Created ||
    status === PaymentStatus.Cancelled ||
    status === PaymentStatus.Failed ||
    (hasPaymentError && !canGoNext && !isProcessing);

  return { canGoNext, canPayOrGoBack, isProcessing };
}

// Codes of the issues the backend refuses process/next with when the stored payment status does not allow it
const paymentStatusIssueCodes = ['PaymentNotCompleted', 'PaymentAlreadyCompleted'];

export function isPaymentStatusIssue(issue: BackendValidationIssue): boolean {
  return !!issue.code && paymentStatusIssueCodes.includes(issue.code);
}

/**
 * True when process/next was refused only because of the payment status, which the payment component shows by
 * fetching it again, so the issues need not be shown as validation errors.
 */
export function isRefusedOnlyForPaymentStatus(validationIssues: BackendValidationIssue[]): boolean {
  const errors = validationIssues.filter((issue) => issue.severity === BackendValidationSeverity.Error);
  return errors.length > 0 && errors.every(isPaymentStatusIssue);
}
