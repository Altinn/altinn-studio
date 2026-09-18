import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function PaymentSummary({ targetBaseComponentId }: Summary2Props) {
  const config = useComponentConfig(targetBaseComponentId, 'Payment');
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.Payment.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Payment.textResourceBindings.title,
  );

  const title = summaryTitle || resolvedTitle;

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={SummaryContains.Presentational}
    >
      <PaymentReceiptDetails title={title} />
    </SummaryFlex>
  );
}
