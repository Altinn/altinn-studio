import React from 'react';

import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummaryById, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

type Props = Pick<SummaryRendererProps<'Cards'>, 'targetNode' | 'overrides'>;

function Child({ id, overrides }: { id: string | undefined } & Pick<Props, 'overrides'>) {
  const child = useNode(id);
  if (!child) {
    return null;
  }

  return (
    <SummaryComponentFor
      key={child.id}
      targetNode={child}
      overrides={{
        ...overrides,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}

export function CardsSummary({ targetNode, overrides }: Props) {
  const cardsInternal = useNodeItem(targetNode, (i) => i.cardsInternal);
  const childIds = cardsInternal.map((card) => card.childIds).flat();

  return (
    <>
      {childIds.map((childId) => (
        <Child
          key={childId}
          id={childId}
          overrides={overrides}
        />
      ))}
    </>
  );
}

export function CardsSummary2({ target }: Summary2Props<'Cards'>) {
  const item = useNodeItem(target, (i) => i.cardsInternal);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const childIds = item
    .map((card) => card.childIds)
    .filter((id) => !!id)
    .flat();

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={target}
    >
      {childIds.map((childId) => (
        <EmptyChildrenBoundary key={childId}>
          <ComponentSummaryById componentId={childId} />
        </EmptyChildrenBoundary>
      ))}
    </SummaryFlexForContainer>
  );
}
