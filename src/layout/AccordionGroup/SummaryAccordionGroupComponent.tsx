import React from 'react';

import { SummaryAccordionComponent, SummaryAccordionComponent2 } from 'src/layout/Accordion/SummaryAccordion';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const SummaryAccordionGroupComponent = ({ targetNode, ...rest }: SummaryRendererProps<'AccordionGroup'>) => {
  const { childComponents } = useNodeItem(targetNode);
  return childComponents.map((childId) => (
    <Child
      key={childId}
      id={childId}
      {...rest}
    />
  ));
};

export const SummaryAccordionGroupComponent2 = ({ target, ...rest }: Summary2Props<'AccordionGroup'>) => {
  const { childComponents } = useNodeItem(target);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={target}
    >
      {childComponents.map((childId) => (
        <Child2
          target={target}
          key={childId}
          id={childId}
          {...rest}
        />
      ))}
    </SummaryFlexForContainer>
  );
};

function Child2({ id, ...rest }: { id: string } & Omit<Summary2Props<'AccordionGroup'>, 'targetNode'>) {
  const targetNode = useNode(id); // as LayoutNode<'Accordion'> | undefined;

  if (!targetNode) {
    return null;
  }

  if (!targetNode.isType('Accordion')) {
    return null;
  }

  return (
    <EmptyChildrenBoundary>
      <SummaryAccordionComponent2
        {...rest}
        target={targetNode}
      />
    </EmptyChildrenBoundary>
  );
}

function Child({ id, ...rest }: { id: string } & Omit<SummaryRendererProps<'AccordionGroup'>, 'targetNode'>) {
  const targetNode = useNode(id) as LayoutNode<'Accordion'> | undefined;
  if (!targetNode) {
    return null;
  }

  return (
    <SummaryAccordionComponent
      key={targetNode.id}
      targetNode={targetNode}
      {...rest}
    />
  );
}
