import React from 'react';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompSummary } from 'src/layout/Summary/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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

  canRenderInTable(): boolean {
    return false;
  }
}

export const Config = {
  def: new Summary(),
};

export type TypeConfig = {
  layout: ILayoutCompSummary;
  nodeItem: ExprResolved<ILayoutCompSummary>;
  nodeObj: LayoutNode;
};
