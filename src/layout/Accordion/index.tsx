import React from 'react';

import { Accordion as AccordionComponent } from 'src/layout/Accordion/Accordion';
import { AccordionDef } from 'src/layout/Accordion/config.def.generated';
import { AccordionHierarchyGenerator } from 'src/layout/Accordion/hierarchy';
import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';

export class Accordion extends AccordionDef {
  private _hierarchyGenerator = new AccordionHierarchyGenerator();

  render(props: PropsFromGenericComponent<'Accordion'>): React.JSX.Element | null {
    return <AccordionComponent {...props} />;
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'Accordion'> {
    return this._hierarchyGenerator;
  }

  renderSummary(props): JSX.Element | null {
    return <SummaryAccordionComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }
}
