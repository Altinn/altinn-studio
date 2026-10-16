import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class IFrameDef extends PresentationComponent<'IFrame'> {
  protected readonly type = 'IFrame';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 318c130c900f487dba115dda986cf3b96592d8be7e87ac2a7f2ce1774ab00c00
