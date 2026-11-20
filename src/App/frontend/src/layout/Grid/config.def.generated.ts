import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class GridDef extends ContainerComponent<'Grid'> {
  protected readonly type = 'Grid';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: dd634c4b9cca9496c972fe9d6e566aecc9eb0ea31ff4e8a4cedeec061a236487
