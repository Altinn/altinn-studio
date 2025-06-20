import React from 'react';
import type { JSX } from 'react';

import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type Props = Pick<SummaryRendererProps<'Tabs'>, 'targetNode' | 'overrides'>;

export function TabsSummaryComponent({ targetNode, overrides }: Props): JSX.Element | null {
  const tabsInternal = useNodeItem(targetNode, (i) => i.tabsInternal);
  const childIds = tabsInternal.map((card) => card.childIds).flat();

  return (
    <>
      {childIds.map((childId) => (
        <Child
          key={childId}
          nodeId={childId}
          overrides={overrides}
        />
      ))}
    </>
  );
}

function Child({ nodeId, overrides }: { nodeId: string } & Pick<Props, 'overrides'>) {
  const node = useNode(nodeId);
  if (!node) {
    return null;
  }

  return (
    <SummaryComponentFor
      key={node.id}
      targetNode={node}
      overrides={{
        ...overrides,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}
