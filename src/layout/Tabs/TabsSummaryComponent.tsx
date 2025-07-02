import React from 'react';
import type { JSX } from 'react';

import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useNode } from 'src/utils/layout/NodesContext';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type Props = Pick<SummaryRendererProps<'Tabs'>, 'targetNode' | 'overrides'>;

export function TabsSummaryComponent({ targetNode, overrides }: Props): JSX.Element | null {
  const { tabs } = useExternalItem(targetNode.baseId, 'Tabs');
  const childIds = tabs.map((card) => card.children).flat();

  return (
    <>
      {childIds.map((childId) => (
        <Child
          key={childId}
          baseId={childId}
          overrides={overrides}
        />
      ))}
    </>
  );
}

function Child({ baseId, overrides }: { baseId: string } & Pick<Props, 'overrides'>) {
  const nodeId = useIndexedId(baseId);
  const node = useNode(nodeId);
  const canRender = useHasCapability('renderInTabs');
  if (!node || !canRender(baseId)) {
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
