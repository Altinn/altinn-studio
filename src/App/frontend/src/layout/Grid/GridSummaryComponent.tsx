import React from 'react';

import { getComponentDef } from 'src/layout';
import { useBaseIdsFromGrid } from 'src/layout/Grid/tools';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function GridSummaryComponent({ targetBaseComponentId, ...rest }: SummaryRendererProps) {
  const baseIds = useBaseIdsFromGrid(targetBaseComponentId);

  return (
    <>
      {baseIds.map((childId, idx) => (
        <Child
          key={childId}
          childBaseId={childId}
          isLast={idx === baseIds.length - 1}
          {...rest}
        />
      ))}
    </>
  );
}

function Child({
  childBaseId,
  isLast,
  overrides,
}: { childBaseId: string; isLast: boolean } & Omit<SummaryRendererProps, 'targetBaseComponentId'>) {
  const component = useExternalItem(childBaseId);
  if (!component || !('renderSummary' in getComponentDef(component.type))) {
    return null;
  }

  return (
    <SummaryComponentFor
      targetBaseComponentId={childBaseId}
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
