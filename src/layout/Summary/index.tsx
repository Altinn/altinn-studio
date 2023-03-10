import React from 'react';

import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Summary extends ContainerComponent<'Summary'> {
  directRender(): boolean {
    return true;
  }

  render(props: PropsFromGenericComponent<'Summary'>): JSX.Element | null {
    return (
      <SummaryComponent
        summaryNode={props.node}
        overrides={props.overrideItemProps}
      />
    );
  }

  renderSummary(): JSX.Element | null {
    // If the code ever ends up with a Summary component referencing another Summary component, we should not end up
    // in an infinite loop by rendering them all. This is usually stopped early in <SummaryComponent />.
    return null;
  }

  useDisplayData(): string {
    return '';
  }
}
