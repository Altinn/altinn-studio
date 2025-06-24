import React from 'react';

import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummaryById, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

type Props = Pick<SummaryRendererProps<'Cards'>, 'targetNode' | 'overrides'>;

function Child({ baseId, overrides }: { baseId: string | undefined } & Pick<Props, 'overrides'>) {
  const id = useIndexedId(baseId);
  const child = useNode(id);
  const canRender = useHasCapability('renderInCards');
  if (!child || !canRender(baseId)) {
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
  const cardsInternal = useNodeItem(targetNode, (i) => i.cards);
  const children = cardsInternal.map((card) => card.children).flat();

  return (
    <>
      {children.map((childId) => (
        <Child
          key={childId}
          baseId={childId}
          overrides={overrides}
        />
      ))}
    </>
  );
}

export function CardsSummary2({ target }: Summary2Props<'Cards'>) {
  const canRender = useHasCapability('renderInCards');
  const idMutator = useComponentIdMutator();
  const children = useNodeItem(target, (i) => i.cards.map((c) => c.children).flat())
    .filter(canRender)
    .filter(typedBoolean);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={target}
    >
      {children.map((childId) => (
        <EmptyChildrenBoundary key={childId}>
          <ComponentSummaryById componentId={idMutator?.(childId) ?? childId} />
        </EmptyChildrenBoundary>
      ))}
    </SummaryFlexForContainer>
  );
}
