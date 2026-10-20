import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class DividerDef extends PresentationComponent<'Divider'> {
  protected readonly type = 'Divider';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 25e30f7ca35f87022b8eb92df371ce76f491ca00dc41e28237afcb9e8a1b8396
