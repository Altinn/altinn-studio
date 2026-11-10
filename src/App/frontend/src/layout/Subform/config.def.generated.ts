import type { JSX } from 'react';

import { FormComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class SubformDef extends FormComponent<'Subform'> {
  protected readonly type = 'Subform';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: 2f97f16eb94ab175c239ef401cf67780e5971a5d76f63535ed826995e5a42480
