import React from 'react';

import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummaryWrapper';
import { Summary2StoreProvider } from 'src/layout/Summary2/summaryStoreContext';
import { useExternalItem } from 'src/utils/layout/hooks';
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
  const target = useExternalItem(baseComponentId, 'Summary2').target;
  return (
    <Summary2StoreProvider baseComponentId={baseComponentId}>
      <TaskSummaryWrapper taskId={target?.taskId}>
        <SummaryBody target={target} />
      </TaskSummaryWrapper>
    </Summary2StoreProvider>
  );
}

export const SummaryComponent2 = React.memo(SummaryComponent2Inner);
SummaryComponent2.displayName = 'SummaryComponent2';
