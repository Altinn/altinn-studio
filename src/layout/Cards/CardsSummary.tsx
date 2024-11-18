import React from 'react';

import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type Props = Pick<SummaryRendererProps<'Cards'>, 'targetNode' | 'summaryNode' | 'overrides'>;

export function CardsSummary({ targetNode, summaryNode, overrides }: Props) {
  const cardsInternal = useNodeItem(targetNode, (i) => i.cardsInternal);
  const childIds = cardsInternal.map((card) => card.childIds).flat();

  return (
    <>
      {childIds.map((childId) => (
        <Child
          key={childId}
          id={childId}
          summaryNode={summaryNode}
          overrides={overrides}
        />
      ))}
    </>
  );
}

function Child({ id, summaryNode, overrides }: { id: string | undefined } & Pick<Props, 'summaryNode' | 'overrides'>) {
  const child = useNode(id);
  if (!child) {
    return null;
  }

  return (
    <SummaryComponent
      key={child.id}
      summaryNode={summaryNode}
      overrides={{
        ...overrides,
        targetNode: child,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}
