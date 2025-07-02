import React from 'react';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type PaymentSummaryProps = {
  componentNode: LayoutNode<'Payment'>;
};

export function PaymentSummary({ componentNode }: PaymentSummaryProps) {
  const title = useItemWhenType(componentNode.baseId, 'Payment').textResourceBindings?.title;

  return (
    <SummaryFlex
      target={componentNode}
      content={SummaryContains.Presentational}
    >
      <PaymentReceiptDetails title={title} />
    </SummaryFlex>
  );
}
