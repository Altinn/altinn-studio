import React from 'react';

import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import { ComponentSummaryById } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummaryWrapper';
import { Summary2StoreProvider } from 'src/layout/Summary2/summaryStoreContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryComponent2 {
  summaryNode: LayoutNode<'Summary2'>;
}

interface SummaryBodyProps {
  target?: CompSummary2External['target'];
}

function SummaryBody({ target }: SummaryBodyProps) {
  if (!target?.id) {
    return <LayoutSetSummary />;
  }

  if (target.type === 'layoutSet') {
    return <LayoutSetSummary />;
  }

  if (target.type === 'page') {
    return <LayoutSetSummary pageKey={target.id} />;
  }

  // Component is the default
  return <ComponentSummaryById componentId={target.id} />;
}

export function SummaryComponent2({ summaryNode }: ISummaryComponent2) {
  const item = useNodeItem(summaryNode);

  return (
    <TaskStoreProvider>
      <Summary2StoreProvider
        summaryNode={summaryNode}
        summaryItem={item}
      >
        <TaskSummaryWrapper taskId={item?.target?.taskId}>
          <SummaryBody target={item?.target} />
        </TaskSummaryWrapper>
      </Summary2StoreProvider>
    </TaskStoreProvider>
  );
}
