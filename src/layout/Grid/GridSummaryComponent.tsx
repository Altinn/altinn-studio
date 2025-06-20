import React from 'react';

import { useNodeIdsFromGrid } from 'src/layout/Grid/tools';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function GridSummaryComponent({ targetNode, ...rest }: SummaryRendererProps<'Grid'>) {
  const nodeIds = useNodeIdsFromGrid(targetNode);

  return (
    <>
      {nodeIds.map((nodeId, idx) => (
        <Child
          key={nodeId}
          nodeId={nodeId}
          isLast={idx === nodeIds.length - 1}
          {...rest}
        />
      ))}
    </>
  );
}

function Child({
  nodeId,
  isLast,
  overrides,
}: { nodeId: string; isLast: boolean } & Omit<SummaryRendererProps<'Grid'>, 'targetNode'>) {
  const node = useNode(nodeId);

  if (!node || !('renderSummary' in node.def)) {
    return null;
  }

  return (
    <SummaryComponentFor
      targetNode={node}
      overrides={{
        ...overrides,
        display: {
          ...overrides?.display,
          hideBottomBorder: isLast,
        },
      }}
    />
  );
}
