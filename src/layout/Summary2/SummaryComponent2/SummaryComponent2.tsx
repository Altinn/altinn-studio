import React from 'react';

import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import { ComponentSummaryById } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummaryWrapper';
import { Summary2StoreProvider } from 'src/layout/Summary2/summaryStoreContext';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryComponent2 {
  summaryNode: LayoutNode<'Summary2'>;
}

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
  return <ComponentSummaryById componentId={target.id} />;
}

function SummaryComponent2Inner({ summaryNode }: ISummaryComponent2) {
  const target = useExternalItem(summaryNode.baseId, 'Summary2').target;
  return (
    <TaskStoreProvider>
      <Summary2StoreProvider node={summaryNode}>
        <TaskSummaryWrapper taskId={target?.taskId}>
          <SummaryBody target={target} />
        </TaskSummaryWrapper>
      </Summary2StoreProvider>
    </TaskStoreProvider>
  );
}

export const SummaryComponent2 = React.memo(SummaryComponent2Inner);
SummaryComponent2.displayName = 'SummaryComponent2';
