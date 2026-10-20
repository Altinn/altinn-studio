import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class AlertDef extends PresentationComponent<'Alert'> {
  protected readonly type = 'Alert';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 427e0042e9629b776bf0e25bd4779c4c4cc218190fd6126a9599fb53e840a2a2
