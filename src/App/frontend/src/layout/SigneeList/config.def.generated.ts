import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class SigneeListDef extends PresentationComponent<'SigneeList'> {
  protected readonly type = 'SigneeList';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 8d6ebe62f138ad23cc54d606a6735ddc6f9721519cb4c1f009788d59d64e0dd1
