import React from 'react';

import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummary, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useExternalItem } from 'src/utils/layout/hooks';
import { typedBoolean } from 'src/utils/typing';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

type Props = Pick<SummaryRendererProps, 'targetBaseComponentId' | 'overrides'>;

function Child({ baseId, overrides }: { baseId: string | undefined } & Pick<Props, 'overrides'>) {
  const canRender = useHasCapability('renderInCards');
  if (!baseId || !canRender(baseId)) {
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

export function CardsSummary({ targetBaseComponentId, overrides }: Props) {
  const children = useExternalItem(targetBaseComponentId, 'Cards')
    .cards.map((card) => card.children)
    .flat();

  return (
    <>
      {children.map((childId) => (
        <Child
          key={childId}
          baseId={childId}
          overrides={overrides}
        />
      ))}
    </>
  );
}

export function CardsSummary2({ targetBaseComponentId }: Summary2Props) {
  const canRender = useHasCapability('renderInCards');
  const children = useExternalItem(targetBaseComponentId, 'Cards')
    .cards.map((c) => c.children)
    .flat()
    .filter(canRender)
    .filter(typedBoolean);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      targetBaseId={targetBaseComponentId}
    >
      {children.map((childId) => (
        <EmptyChildrenBoundary key={childId}>
          <ComponentSummary targetBaseComponentId={childId} />
        </EmptyChildrenBoundary>
      ))}
    </SummaryFlexForContainer>
  );
}
