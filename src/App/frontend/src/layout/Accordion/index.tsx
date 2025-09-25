import React, { forwardRef } from 'react';

import { Accordion as AccordionComponent } from 'src/layout/Accordion/Accordion';
import { AccordionDef } from 'src/layout/Accordion/config.def.generated';
import { SummaryAccordionComponent, SummaryAccordionComponent2 } from 'src/layout/Accordion/SummaryAccordion';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { claimNonRepeatingChildren } from 'src/utils/layout/plugins/claimNonRepeatingChildren';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ChildClaimerProps, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Accordion extends AccordionDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Accordion'>>(
    function LayoutComponentAccordionRender(props, _): React.JSX.Element | null {
      return <AccordionComponent {...props} />;
    },
  );

  renderSummary(props: SummaryRendererProps): React.JSX.Element | null {
    return <SummaryAccordionComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  renderSummary2(props: Summary2Props): React.JSX.Element | null {
    return (
      <EmptyChildrenBoundary>
        <SummaryAccordionComponent2 {...props} />
      </EmptyChildrenBoundary>
    );
  }

  claimChildren(props: ChildClaimerProps<'Accordion'>): void {
    claimNonRepeatingChildren(props, props.item.children, {
      onlyWithCapability: 'renderInAccordion',
      componentType: 'Accordion',
    });
  }
}
