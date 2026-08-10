import React from 'react';

import cn from 'classnames';

import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummaryWrapper';
import { Summary2StoreProvider } from 'src/layout/Summary2/summaryStoreContext';
import printStyles from 'src/styles/print.module.css';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';

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

function SummaryComponent2Inner({ baseComponentId }: Pick<PropsFromGenericComponent<'Summary2'>, 'baseComponentId'>) {
  const { pageBreak, target } = useItemWhenType(baseComponentId, 'Summary2');
  return (
    <div
      className={cn(printStyles.pageBreakBoundary, pageBreakStyles(pageBreak))}
      data-testid='summary2-component'
    >
      <Summary2StoreProvider baseComponentId={baseComponentId}>
        <TaskSummaryWrapper taskId={target?.taskId}>
          <SummaryBody target={target} />
        </TaskSummaryWrapper>
      </Summary2StoreProvider>
    </div>
  );
}

export const SummaryComponent2 = React.memo(SummaryComponent2Inner);
SummaryComponent2.displayName = 'SummaryComponent2';
