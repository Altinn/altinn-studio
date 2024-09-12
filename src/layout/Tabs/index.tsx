import React, { forwardRef, type JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { TabsDef } from 'src/layout/Tabs/config.def.generated';
import { Tabs as TabsComponent } from 'src/layout/Tabs/Tabs';
import { TabsSummary } from 'src/layout/Tabs/TabsSummary';
import { TabsSummaryComponent } from 'src/layout/Tabs/TabsSummaryComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Tabs extends TabsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Tabs'>>(
    function LayoutComponentTabsRender(props, _): JSX.Element | null {
      return <TabsComponent {...props} />;
    },
  );

  renderSummary({ summaryNode, targetNode, overrides }: SummaryRendererProps<'Tabs'>): JSX.Element | null {
    return (
      <TabsSummaryComponent
        targetNode={targetNode}
        summaryNode={summaryNode}
        overrides={overrides}
      />
    );
  }

  renderSummary2(props: Summary2Props<'Tabs'>): JSX.Element | null {
    return <TabsSummary componentNode={props.target} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  getDisplayData(): string {
    return '';
  }

  public validateDataModelBindings(): string[] {
    return [];
  }
}
