import React, { forwardRef } from 'react';

import { Accordion as AccordionComponent } from 'src/layout/Accordion/Accordion';
import { AccordionDef } from 'src/layout/Accordion/config.def.generated';
import { SummaryAccordionComponent } from 'src/layout/Accordion/SummaryAccordion';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class Accordion extends AccordionDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Accordion'>>(
    function LayoutComponentAccordionRender(props, _): React.JSX.Element | null {
      return <AccordionComponent {...props} />;
    },
  );

  renderSummary(props: SummaryRendererProps<'Accordion'>): React.JSX.Element | null {
    return <SummaryAccordionComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }
}
