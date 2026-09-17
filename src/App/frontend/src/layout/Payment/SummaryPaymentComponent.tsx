import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export const SummaryPaymentComponent = ({ targetBaseComponentId }: SummaryRendererProps) => {
  const config = useComponentConfig(targetBaseComponentId, 'Payment');
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Payment.textResourceBindings.title,
  );
  const title = config.textResourceBindings?.title === undefined ? undefined : resolvedTitle;
  return <PaymentReceiptDetails title={title} />;
};
