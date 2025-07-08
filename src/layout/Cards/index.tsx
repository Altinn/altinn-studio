import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Cards as CardsComponent } from 'src/layout/Cards/Cards';
import { CardsSummary, CardsSummary2 } from 'src/layout/Cards/CardsSummary';
import { CardsDef } from 'src/layout/Cards/config.def.generated';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Cards extends CardsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Cards'>>(
    function LayoutComponentCardRender(props, _): React.JSX.Element | null {
      return <CardsComponent {...props} />;
    },
  );

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  renderSummary2(props: Summary2Props): React.JSX.Element | null {
    return (
      <EmptyChildrenBoundary>
        <CardsSummary2 {...props} />
      </EmptyChildrenBoundary>
    );
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <CardsSummary {...props} />;
  }
}
