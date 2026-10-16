import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class SigningDocumentListDef extends PresentationComponent<'SigningDocumentList'> {
  protected readonly type = 'SigningDocumentList';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: e7b6ab80169c567602db4e049868f5f4d0bf284269c03078714ca86211dfe592
