import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class AccordionGroupDef extends ContainerComponent<'AccordionGroup'> {
  protected readonly type = 'AccordionGroup';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 2dce37454371398ba148bc617ee60b04c2ba2bd4971c1e995e4870aceccb2dda
