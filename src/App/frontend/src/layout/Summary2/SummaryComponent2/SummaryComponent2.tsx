import React from 'react';
import type { PropsWithChildren } from 'react';

import cn from 'classnames';
import type { IPageBreak } from '@app/layout-contract/generated/common.generated';
import type { CompSummary2External } from '@app/layout-contract/generated/components/Summary2/config.generated';

import { EmptyChildrenBoundary, useHasOnlyEmptyChildren } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummaryWrapper';
import { Summary2StoreProvider, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import printStyles from 'src/styles/print.module.css';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';

interface SummaryBodyProps {
  target?: CompSummary2External['target'];
}

function SummaryBody({ target }: SummaryBodyProps) {
  if (!target || target.type === 'layoutSet') {
    return <LayoutSetSummary />;
  }

  if (target.type === 'page') {
    return <LayoutSetSummary pageKey={target.id} />;
  }

  // Component is the default
  return <ComponentSummary targetBaseComponentId={target.id} />;
}

function Summary2PrintBoundary({ children, pageBreak }: PropsWithChildren<{ pageBreak?: ExprResolved<IPageBreak> }>) {
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const hasOnlyEmptyChildren = useHasOnlyEmptyChildren();
  const shouldRenderMarkers = pageBreak && !(hideEmptyFields && hasOnlyEmptyChildren);

  return (
    <>
      {shouldRenderMarkers && (
        <div
          aria-hidden='true'
          className={cn(printStyles.pageBreakMarker, pageBreakStyles({ breakBefore: pageBreak.breakBefore }))}
          data-testid='summary2-page-break-before'
        />
      )}
      {children}
      {shouldRenderMarkers && (
        <div
          aria-hidden='true'
          className={cn(printStyles.pageBreakMarker, pageBreakStyles({ breakAfter: pageBreak.breakAfter }))}
          data-testid='summary2-page-break-after'
        />
      )}
    </>
  );
}

function SummaryComponent2Inner({ baseComponentId }: Pick<PropsFromGenericComponent<'Summary2'>, 'baseComponentId'>) {
  const { pageBreak, target } = useItemWhenType(baseComponentId, 'Summary2');
  return (
    <Summary2StoreProvider baseComponentId={baseComponentId}>
      <EmptyChildrenBoundary reportSelf={false}>
        <Summary2PrintBoundary pageBreak={pageBreak}>
          <TaskSummaryWrapper taskId={target?.taskId}>
            <SummaryBody target={target} />
          </TaskSummaryWrapper>
        </Summary2PrintBoundary>
      </EmptyChildrenBoundary>
    </Summary2StoreProvider>
  );
}

export const SummaryComponent2 = React.memo(SummaryComponent2Inner);
SummaryComponent2.displayName = 'SummaryComponent2';
