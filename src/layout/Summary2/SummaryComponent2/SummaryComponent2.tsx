import React from 'react';

import { ResolveComponent } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummary';
import { TaskIdStoreProvider } from 'src/layout/Summary2/taskIdStore';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryComponent2 {
  summaryNode: LayoutNode<'Summary2'>;
}

export function _SummaryComponent2({ summaryNode }: ISummaryComponent2) {
  if (!summaryNode.item.target) {
    return <LayoutSetSummary />;
  }

  if (summaryNode.item.target?.taskId) {
    return (
      <TaskIdStoreProvider>
        <TaskSummaryWrapper
          taskId={summaryNode.item.target?.taskId}
          pageId={summaryNode.item.target?.type === 'page' ? summaryNode.item.target.id : undefined}
          componentId={summaryNode.item.target?.type === 'component' ? summaryNode.item.target.id : undefined}
          summaryOverrides={summaryNode.item.overrides}
          showAccordion={summaryNode.item.showPageInAccordion}
        />
      </TaskIdStoreProvider>
    );
  }

  if (summaryNode.item.target?.type === 'page') {
    return (
      <PageSummary
        pageId={summaryNode.item.target.id}
        summaryOverrides={summaryNode.item.overrides}
      />
    );
  }

  if (summaryNode.item.target?.type === 'component') {
    return (
      <ResolveComponent
        summaryProps={summaryNode.item}
        summaryOverrides={summaryNode.item.overrides}
      />
    );
  }
}

export const SummaryComponent2 = React.forwardRef(_SummaryComponent2);
