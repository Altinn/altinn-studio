import React from 'react';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type PaymentSummaryProps = {
  componentNode: LayoutNode<'Payment'>;
};

export function PaymentSummary({ componentNode }: PaymentSummaryProps) {
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  return <PaymentReceiptDetails title={title} />;
}
