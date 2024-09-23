import React from 'react';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export const SummaryPaymentComponent = ({ targetNode }: SummaryRendererProps<'Payment'>) => {
  const title = useNodeItem(targetNode, (i) => i.textResourceBindings?.title);
  return <PaymentReceiptDetails title={title} />;
};
