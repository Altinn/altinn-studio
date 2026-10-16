import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class PaymentDetailsDef extends PresentationComponent<'PaymentDetails'> {
  protected readonly type = 'PaymentDetails';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 3070cd053805e8a6ce4c7d85bc9ea9d83f5303bd675d0f3fd5de800906e70137
