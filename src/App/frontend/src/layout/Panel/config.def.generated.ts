import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class PanelDef extends PresentationComponent<'Panel'> {
  protected readonly type = 'Panel';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: ebdee9d45d9e3f3a736b46d9347dc4e178620117f9b33c2fb5fc10d36c57868c
