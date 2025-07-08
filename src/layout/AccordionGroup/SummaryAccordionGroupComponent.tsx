import React from 'react';

import { SummaryAccordionComponent, SummaryAccordionComponent2 } from 'src/layout/Accordion/SummaryAccordion';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const SummaryAccordionGroupComponent = ({ targetBaseComponentId, ...rest }: SummaryRendererProps) => {
  const children = useExternalItem(targetBaseComponentId, 'AccordionGroup')?.children;
  return children?.map((childId) => (
    <Child
      key={childId}
      id={childId}
      {...rest}
    />
  ));
};

export const SummaryAccordionGroupComponent2 = ({ targetBaseComponentId, ...rest }: Summary2Props) => {
  const children = useExternalItem(targetBaseComponentId, 'AccordionGroup')?.children;
  const canRender = useHasCapability('renderInAccordionGroup');
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      targetBaseId={targetBaseComponentId}
    >
      {children?.filter(canRender).map((childId) => (
        <Child2
          key={childId}
          id={childId}
          {...rest}
        />
      ))}
    </SummaryFlexForContainer>
  );
};

function Child2({ id, ...rest }: { id: string } & Omit<Summary2Props, 'targetBaseComponentId'>) {
  const component = useExternalItem(id);
  if (!component || component.type !== 'Accordion') {
    return null;
  }

  return (
    <EmptyChildrenBoundary>
      <SummaryAccordionComponent2
        {...rest}
        targetBaseComponentId={id}
      />
    </EmptyChildrenBoundary>
  );
}

function Child({ id, ...rest }: { id: string } & Omit<SummaryRendererProps, 'targetBaseComponentId'>) {
  const component = useExternalItem(id);
  if (!component || component.type !== 'Accordion') {
    return null;
  }

  return (
    <SummaryAccordionComponent
      targetBaseComponentId={id}
      {...rest}
    />
  );
}
