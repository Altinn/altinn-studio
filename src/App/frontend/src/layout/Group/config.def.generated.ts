import type { JSX } from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class GroupDef extends ContainerComponent<'Group'> {
  protected readonly type = 'Group';

  directRender(): boolean {
    return true;
  }

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: fc7af4e3913fe6b5270509291cab50453c9bd685f4bad557393e4783a3804c37
