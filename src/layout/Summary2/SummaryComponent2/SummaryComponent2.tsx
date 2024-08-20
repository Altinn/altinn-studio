import React from 'react';

import { ResolveComponent } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { PageSummary } from 'src/layout/Summary2/SummaryComponent2/PageSummary';
import { TaskSummary, TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummary';
import { Summary2StoreProvider } from 'src/layout/Summary2/taskIdStore';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryComponent2 {
  summaryNode: LayoutNode<'Summary2'>;
}

function SummaryBody({ summaryNode }: ISummaryComponent2) {
  const target = useNodeItem(summaryNode, (i) => i.target);
  const overrides = useNodeItem(summaryNode, (i) => i.overrides);
  const showPageInAccordion = useNodeItem(summaryNode, (i) => i.showPageInAccordion);

  if (!target) {
    return <LayoutSetSummary />;
  }

  if (target.taskId) {
    return (
      <TaskSummary
        taskId={target?.taskId}
        pageId={target?.type === 'page' ? target.id : undefined}
        componentId={target?.type === 'component' ? target.id : undefined}
        summaryOverrides={overrides}
        showAccordion={showPageInAccordion}
      />
    );
  }

  if (target.type === 'page') {
    return (
      <PageSummary
        pageId={target.id}
        summaryOverrides={overrides}
      />
    );
  }

  if (target.type === 'component') {
    return (
      <ResolveComponent
        summaryTarget={target}
        summaryOverrides={overrides}
      />
    );
  }
}

export function _SummaryComponent2({ summaryNode }: ISummaryComponent2) {
  const { target, showPageInAccordion, overrides } = useNodeItem(summaryNode, (i) => ({
    target: i.target,
    showPageInAccordion: i.showPageInAccordion,
    overrides: i.overrides,
  }));

  return (
    <Summary2StoreProvider summaryNode={summaryNode}>
      <TaskSummaryWrapper
        taskId={target?.taskId}
        pageId={target?.type === 'page' ? target.id : undefined}
        componentId={target?.type === 'component' ? target.id : undefined}
        summaryOverrides={overrides}
        showAccordion={showPageInAccordion}
      >
        <SummaryBody summaryNode={summaryNode} />
      </TaskSummaryWrapper>
    </Summary2StoreProvider>
  );
}

export const SummaryComponent2 = React.forwardRef(_SummaryComponent2);
