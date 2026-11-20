import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class AttachmentListDef extends PresentationComponent<'AttachmentList'> {
  protected readonly type = 'AttachmentList';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 50fc50a4b65aed18d416d5189ff831151789044a5e26d9a1203f437e6b2a70fd
