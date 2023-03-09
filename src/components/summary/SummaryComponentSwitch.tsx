import React from 'react';

import { SummaryBoilerplate } from 'src/components/summary/SummaryBoilerplate';
import { SummaryGroupComponent } from 'src/components/summary/SummaryGroupComponent';
import { GenericComponent } from 'src/layout/GenericComponent';
import { FormComponent } from 'src/layout/LayoutComponent';
import type { ISummaryComponent } from 'src/components/summary/SummaryComponent';
import type { ComponentExceptGroupAndSummary } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/hierarchy';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface ISummaryComponentSwitch {
  change: {
    onChangeClick: () => void;
    changeText: string | null;
  };
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNode;
  label: JSX.Element | JSX.Element[] | null | undefined;
  overrides: ISummaryComponent['overrides'];
}

export function SummaryComponentSwitch({ change, summaryNode, targetNode, label, overrides }: ISummaryComponentSwitch) {
  if (targetNode.item.type === 'Group') {
    const correctNode = targetNode as LayoutNodeFromType<'Group'>;
    return (
      <SummaryGroupComponent
        {...change}
        summaryNode={summaryNode}
        targetNode={correctNode}
        overrides={overrides}
      />
    );
  }

  const component = targetNode.getComponent();
  if (component instanceof FormComponent) {
    const RenderSummary = component.renderSummary.bind(component);
    return (
      <>
        <SummaryBoilerplate
          {...change}
          label={label}
          summaryNode={summaryNode}
          targetNode={targetNode}
          overrides={overrides}
        />
        <RenderSummary
          summaryNode={summaryNode}
          targetNode={targetNode as LayoutNodeFromType<ComponentExceptGroupAndSummary>}
        />
      </>
    );
  }

  return <GenericComponent node={targetNode as LayoutNodeFromType<ComponentExceptGroupAndSummary>} />;
}
