import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class ParagraphDef extends PresentationComponent<'Paragraph'> {
  protected readonly type = 'Paragraph';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 481dd45313cb11fc1dd166b03aa7f7bfce2e508ad511bcc03f017c4a17d1f7f7
