import React from 'react';

import { nodesFromGrid } from 'src/layout/Grid/tools';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function GridSummaryComponent({ targetNode, summaryNode }: SummaryRendererProps<'Grid'>): JSX.Element | null {
  const nodes = nodesFromGrid(targetNode).filter((node) => 'renderSummary' in node.def);

  return (
    <>
      {nodes.map((node, idx) => (
        <SummaryComponent
          key={node.item.id}
          summaryNode={summaryNode}
          overrides={{
            targetNode: node,
            display: {
              hideBottomBorder: idx === nodes.length - 1,
            },
          }}
        />
      ))}
    </>
  );
}
