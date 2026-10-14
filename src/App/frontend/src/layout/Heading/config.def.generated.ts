import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class HeadingDef extends PresentationComponent<'Heading'> {
  protected readonly type = 'Heading';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: aaa3c77a9b62ee80e70a345baea7838246b2df111d8b602410d0d05cbbd72ad4
