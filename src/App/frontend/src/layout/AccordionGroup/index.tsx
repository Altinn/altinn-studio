import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AccordionGroup as AccordionGroupComponent } from 'src/layout/AccordionGroup/AccordionGroup';
import { AccordionGroupDef } from 'src/layout/AccordionGroup/config.def.generated';
import {
  SummaryAccordionGroupComponent,
  SummaryAccordionGroupComponent2,
} from 'src/layout/AccordionGroup/SummaryAccordionGroupComponent';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { claimNonRepeatingChildren } from 'src/utils/layout/plugins/claimNonRepeatingChildren';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ChildClaimerProps, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class AccordionGroup extends AccordionGroupDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'AccordionGroup'>>(
    function LayoutComponentAccordionGroupRender(props, _): JSX.Element | null {
      return <AccordionGroupComponent {...props} />;
    },
  );

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <SummaryAccordionGroupComponent {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return (
      <EmptyChildrenBoundary>
        <SummaryAccordionGroupComponent2 {...props} />
      </EmptyChildrenBoundary>
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  claimChildren(props: ChildClaimerProps<'AccordionGroup'>): void {
    claimNonRepeatingChildren(props, props.item.children, {
      onlyWithCapability: 'renderInAccordionGroup',
      componentType: 'AccordionGroup',
    });
  }
}
