import React from 'react';

import { SummaryAccordionComponent, SummaryAccordionComponent2 } from 'src/layout/Accordion/SummaryAccordion';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const SummaryAccordionGroupComponent = ({ targetNode, ...rest }: SummaryRendererProps<'AccordionGroup'>) => {
  const { children } = useNodeItem(targetNode);
  return children.map((childId) => (
    <Child
      key={childId}
      id={childId}
      {...rest}
    />
  ));
};

export const SummaryAccordionGroupComponent2 = ({ target, ...rest }: Summary2Props<'AccordionGroup'>) => {
  const { children } = useNodeItem(target);
  const canRender = useHasCapability('renderInAccordionGroup');
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={target}
    >
      {children.filter(canRender).map((childId) => (
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
  const nodeId = useIndexedId(id);
  const targetNode = useNode(nodeId);
  if (!targetNode || !targetNode.isType('Accordion')) {
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

function Child({ id: _id, ...rest }: { id: string } & Omit<SummaryRendererProps<'AccordionGroup'>, 'targetNode'>) {
  const id = useIndexedId(_id);
  const targetNode = useNode(id);
  if (!targetNode || !targetNode.isType('Accordion')) {
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
