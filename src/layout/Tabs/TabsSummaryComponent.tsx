import React from 'react';
import type { JSX } from 'react';

import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type Props = Pick<SummaryRendererProps<'Tabs'>, 'targetNode' | 'summaryNode' | 'overrides'>;

export function TabsSummaryComponent({ targetNode, summaryNode, overrides }: Props): JSX.Element | null {
  const tabsInternal = useNodeItem(targetNode, (i) => i.tabsInternal);
  const childIds = tabsInternal.map((card) => card.childIds).flat();

  return (
    <>
      {childIds.map((childId) => (
        <Child
          key={childId}
          nodeId={childId}
          summaryNode={summaryNode}
          overrides={overrides}
        />
      ))}
    </>
  );
}

function Child({ nodeId, summaryNode, overrides }: { nodeId: string } & Pick<Props, 'summaryNode' | 'overrides'>) {
  const node = useNode(nodeId);
  if (!node) {
    return null;
  }

  return (
    <SummaryComponent
      key={node.id}
      summaryNode={summaryNode}
      overrides={{
        ...overrides,
        targetNode: node,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}
