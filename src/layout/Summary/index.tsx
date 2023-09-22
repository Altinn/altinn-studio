import React from 'react';
import type { JSX } from 'react';

import { SummaryDef } from 'src/layout/Summary/config.def.generated';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Summary extends SummaryDef {
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

  shouldRenderInAutomaticPDF() {
    return false;
  }

  getDisplayData(): string {
    return '';
  }

  validateDataModelBindings(): string[] {
    return [];
  }
}
