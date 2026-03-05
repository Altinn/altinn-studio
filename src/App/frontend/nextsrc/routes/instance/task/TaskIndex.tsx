import React from 'react';
import { Navigate, useRouteLoaderData } from 'react-router';

import { isPagesSettingsWithGroups, isPagesSettingsWithOrder } from 'nextsrc/core/typeguards';
import type { TaskLoaderData } from 'nextsrc/routes/instance/task/task.loader';

export const TaskIndex = () => {
  const loaderData = useRouteLoaderData('task') as TaskLoaderData;

  if (loaderData.taskType !== 'data' || !('layoutSettings' in loaderData)) {
    throw new Error('TaskIndex requires a data task');
  }

  const { layoutSettings } = loaderData;

  if (isPagesSettingsWithOrder(layoutSettings.pages)) {
    return (
      <Navigate
        to={layoutSettings.pages.order[0]}
        replace
      />
    );
  }

  if (isPagesSettingsWithGroups(layoutSettings.pages)) {
    return (
      <Navigate
        to={layoutSettings.pages.groups[0].order[0]}
        replace
      />
    );
  }

  throw new Error('Layout settings has no page order or groups');
};
