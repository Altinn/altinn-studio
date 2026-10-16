import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class CardsDef extends ContainerComponent<'Cards'> {
  protected readonly type = 'Cards';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 6b209751c45f5cd4b824c28326d1b061faeccf3b09be063d41bec0f4ba55b2c7
