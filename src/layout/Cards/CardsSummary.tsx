import React from 'react';

import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type Props = Pick<SummaryRendererProps<'Cards'>, 'targetNode' | 'summaryNode' | 'overrides'>;

export function CardsSummary({ targetNode, summaryNode, overrides }: Props) {
  const cardsInternal = useNodeItem(targetNode, (i) => i.cardsInternal);
  const children = cardsInternal.map((card) => card.children).flat();

  return (
    <>
      {children.map((child) => {
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
      })}
    </>
  );
}
