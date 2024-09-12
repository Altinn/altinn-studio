import React from 'react';
import type { JSX } from 'react';

import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type Props = Pick<SummaryRendererProps<'Tabs'>, 'targetNode' | 'summaryNode' | 'overrides'>;

export function TabsSummaryComponent({ targetNode, summaryNode, overrides }: Props): JSX.Element | null {
  const tabsInternal = useNodeItem(targetNode, (i) => i.tabsInternal);
  const children = tabsInternal.map((card) => card.children).flat();

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
