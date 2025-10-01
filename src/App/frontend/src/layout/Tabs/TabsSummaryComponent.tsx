import React from 'react';
import type { JSX } from 'react';

import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function TabsSummaryComponent({ targetBaseComponentId, overrides }: SummaryRendererProps): JSX.Element | null {
  const { tabs } = useExternalItem(targetBaseComponentId, 'Tabs');
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

function Child({ baseId, overrides }: { baseId: string } & Pick<SummaryRendererProps, 'overrides'>) {
  const canRender = useHasCapability('renderInTabs');
  if (!canRender(baseId)) {
    return null;
  }

  return (
    <SummaryComponentFor
      targetBaseComponentId={baseId}
      overrides={{
        ...overrides,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}
