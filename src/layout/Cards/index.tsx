import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Cards as CardsComponent } from 'src/layout/Cards/Cards';
import { CardsSummary } from 'src/layout/Cards/CardsSummary';
import { CardsDef } from 'src/layout/Cards/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class Cards extends CardsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Cards'>>(
    function LayoutComponentCardRender(props, _): React.JSX.Element | null {
      return <CardsComponent {...props} />;
    },
  );

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  renderSummary({ summaryNode, targetNode, overrides }: SummaryRendererProps<'Cards'>): JSX.Element | null {
    return (
      <CardsSummary
        targetNode={targetNode}
        summaryNode={summaryNode}
        overrides={overrides}
      />
    );
  }
}
