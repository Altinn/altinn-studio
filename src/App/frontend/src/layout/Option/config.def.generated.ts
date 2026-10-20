import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class OptionDef extends PresentationComponent<'Option'> {
  protected readonly type = 'Option';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 68c25a76238db18766fd7f3ccd49c4ec8316dd77f2bdb38696b44ddbc677a0f6
