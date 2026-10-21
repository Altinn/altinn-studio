import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class DateDef extends PresentationComponent<'Date'> {
  protected readonly type = 'Date';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 3b32c2a064d1e15f099552c3f72ba2afd95f6a1e20ee11a4085ee93efc0eec2a
