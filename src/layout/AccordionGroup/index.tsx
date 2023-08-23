import React from 'react';

import { AccordionGroup as AccordionGroupComponent } from 'src/layout/AccordionGroup/AccordionGroup';
import { AccordionGroupHierarchyGenerator } from 'src/layout/AccordionGroup/hierarchy';
import { SummaryAccordionGroupComponent } from 'src/layout/AccordionGroup/SummaryAccordionGroupComponent';
import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAccordionGroup, ILayoutAccordionGroup } from 'src/layout/AccordionGroup/types';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class AccordionGroup extends ContainerComponent<'AccordionGroup'> {
  private _hierarchyGenerator = new AccordionGroupHierarchyGenerator();

  render(props: PropsFromGenericComponent<'AccordionGroup'>): React.JSX.Element | null {
    return <AccordionGroupComponent {...props} />;
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'AccordionGroup'> {
    return this._hierarchyGenerator;
  }

  renderSummary(props: SummaryRendererProps<'AccordionGroup'>): JSX.Element | null {
    return <SummaryAccordionGroupComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  shouldRenderInAutomaticPDF(node: LayoutNodeFromType<AccordionGroup>): boolean {
    return !node.item.renderAsSummary;
  }

  getDisplayData(): string {
    return '';
  }
}

export const Config = {
  def: new AccordionGroup(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutAccordionGroup;
  nodeItem: IAccordionGroup;
  nodeObj: LayoutNode;
  validTextResourceBindings: 'title';
  validDataModelBindings: undefined;
};
