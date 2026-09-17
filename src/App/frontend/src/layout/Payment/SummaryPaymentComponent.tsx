import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export const SummaryPaymentComponent = ({ targetBaseComponentId }: SummaryRendererProps) => {
  const config = useComponentConfig(targetBaseComponentId, 'Payment');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Payment.textResourceBindings.title);
  return <PaymentReceiptDetails title={title} />;
};
