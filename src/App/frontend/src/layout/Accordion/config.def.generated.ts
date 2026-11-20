import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class AccordionDef extends ContainerComponent<'Accordion'> {
  protected readonly type = 'Accordion';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: fd5eed378779618f9b60e34ddb8197995056a9b2012187e15277bc40d9a8ca09
