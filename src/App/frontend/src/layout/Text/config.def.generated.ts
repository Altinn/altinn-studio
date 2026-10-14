import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class TextDef extends PresentationComponent<'Text'> {
  protected readonly type = 'Text';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 916b2ff2c4c06ef1343977ed560764519758e01656ccc8ad6e8b3a1e55cda91c
