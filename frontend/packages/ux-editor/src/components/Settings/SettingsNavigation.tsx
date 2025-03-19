import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { NavigationReceipt, NavigationTask } from 'app-shared/types/api/LayoutSetsResponse';
import React, { type ReactElement } from 'react';

export const SettingsNavigation = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const taskNavigation = layoutSets?.uiSettings?.taskNavigation || [];

  return (
    <>
      {taskNavigation.map((task: NavigationTask | NavigationReceipt, key: number) => (
        <div key={key}>
          <h1>{task.name}</h1>
          <p>{'taskId' in task ? task.taskId : task.type}</p>
        </div>
      ))}
    </>
  );
};
