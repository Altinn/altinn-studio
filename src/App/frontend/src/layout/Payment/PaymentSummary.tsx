import React from 'react';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function PaymentSummary({ targetBaseComponentId }: Summary2Props) {
  const title = useItemWhenType(targetBaseComponentId, 'Payment').textResourceBindings?.title;

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={SummaryContains.Presentational}
    >
      <PaymentReceiptDetails title={title} />
    </SummaryFlex>
  );
}
