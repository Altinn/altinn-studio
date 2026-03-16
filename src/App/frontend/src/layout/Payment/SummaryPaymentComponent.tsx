import React from 'react';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export const SummaryPaymentComponent = ({ targetBaseComponentId }: SummaryRendererProps) => {
  const title = useItemWhenType(targetBaseComponentId, 'Payment').textResourceBindings?.title;
  return <PaymentReceiptDetails title={title} />;
};
