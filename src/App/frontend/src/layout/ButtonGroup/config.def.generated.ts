import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class ButtonGroupDef extends ContainerComponent<'ButtonGroup'> {
  protected readonly type = 'ButtonGroup';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: ec5e6516f60bb477530d5bcb5a5f79b830423d84d3bd96320ab28b4630854d64
