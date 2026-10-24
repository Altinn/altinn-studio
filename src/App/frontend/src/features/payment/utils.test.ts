import { PaymentStatus } from 'src/features/payment/types';
import { getPaymentActions, isPaymentStatusIssue, isRefusedOnlyForPaymentStatus } from 'src/features/payment/utils';
import { BackendValidationSeverity } from 'src/features/validation';
import type { BackendValidationIssue } from 'src/features/validation';

function issue(code: string, severity = BackendValidationSeverity.Error): BackendValidationIssue {
  return { code, severity, source: 'test', dataElementId: '' };
}

describe('getPaymentActions', () => {
  it.each([
    [PaymentStatus.Uninitialized, false, { canGoNext: false, canPayOrGoBack: false, isProcessing: false }],
    [PaymentStatus.Created, false, { canGoNext: false, canPayOrGoBack: true, isProcessing: false }],
    [PaymentStatus.Cancelled, false, { canGoNext: false, canPayOrGoBack: true, isProcessing: false }],
    [PaymentStatus.Authorized, false, { canGoNext: false, canPayOrGoBack: false, isProcessing: true }],
    [PaymentStatus.Paid, false, { canGoNext: true, canPayOrGoBack: false, isProcessing: false }],
    [PaymentStatus.Skipped, false, { canGoNext: true, canPayOrGoBack: false, isProcessing: false }],
    [PaymentStatus.Failed, false, { canGoNext: false, canPayOrGoBack: true, isProcessing: false }],
    [undefined, true, { canGoNext: false, canPayOrGoBack: true, isProcessing: false }],
    [PaymentStatus.Failed, true, { canGoNext: false, canPayOrGoBack: true, isProcessing: false }],
    [PaymentStatus.Authorized, true, { canGoNext: false, canPayOrGoBack: false, isProcessing: true }],
    [PaymentStatus.Paid, true, { canGoNext: true, canPayOrGoBack: false, isProcessing: false }],
  ])('for %s with a failed pay action: %s', (status, hasPaymentError, expected) => {
    expect(getPaymentActions(status, hasPaymentError)).toEqual(expected);
  });
});

describe('isPaymentStatusIssue', () => {
  it.each([
    ['PaymentNotCompleted', true],
    ['PaymentAlreadyCompleted', true],
    ['MissingSignatures', false],
  ])('%s: %s', (code, expected) => {
    expect(isPaymentStatusIssue(issue(code))).toBe(expected);
  });
});

describe('isRefusedOnlyForPaymentStatus', () => {
  it('is true when every error is about the payment status', () => {
    expect(
      isRefusedOnlyForPaymentStatus([
        issue('PaymentNotCompleted'),
        issue('SomeWarning', BackendValidationSeverity.Warning),
      ]),
    ).toBe(true);
  });

  it('is false when another error refused the transition too', () => {
    expect(isRefusedOnlyForPaymentStatus([issue('PaymentNotCompleted'), issue('required')])).toBe(false);
  });

  it('is false without errors', () => {
    expect(isRefusedOnlyForPaymentStatus([issue('PaymentNotCompleted', BackendValidationSeverity.Warning)])).toBe(
      false,
    );
  });
});
