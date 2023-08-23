import React from 'react';

import { Accordion as AccordionComponent } from 'src/layout/Accordion/Accordion';
import { AccordionHierarchyGenerator } from 'src/layout/Accordion/hierarchy';
import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAccordion, ILayoutAccordion } from 'src/layout/Accordion/types';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Accordion extends PresentationComponent<'Accordion'> {
  private _hierarchyGenerator = new AccordionHierarchyGenerator();

  render(props: PropsFromGenericComponent<'Accordion'>): React.JSX.Element | null {
    return <AccordionComponent {...props} />;
  }

  renderSummary(props): JSX.Element | null {
    return <SummaryAccordionComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'Accordion'> {
    return this._hierarchyGenerator;
  }

  canRenderInAccordionGroup(): boolean {
    return true;
  }
}

export const Config = {
  def: new Accordion(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutAccordion;
  nodeItem: IAccordion;
  nodeObj: LayoutNode;
  validTextResourceBindings: 'title';
  validDataModelBindings: undefined;
};
