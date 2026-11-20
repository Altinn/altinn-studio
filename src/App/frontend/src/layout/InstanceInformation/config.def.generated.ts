import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class InstanceInformationDef extends PresentationComponent<'InstanceInformation'> {
  protected readonly type = 'InstanceInformation';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: f8f3de9bb32e0f7b22247c70beb53a51e4ebe3dc0c105585ba3f525059b32c53
