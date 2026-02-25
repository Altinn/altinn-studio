import React from 'react';
import { Navigate, useRouteLoaderData } from 'react-router';

import { isPagesSettingsWithGroups, isPagesSettingsWithOrder } from 'nextsrc/core/typeguards';

import type { taskLoader } from 'nextsrc/features/form/pages/task/taskLoader';

export const TaskIndex = () => {
  const { layoutSettings } = useRouteLoaderData('task') as Awaited<ReturnType<typeof taskLoader>>;

  if (isPagesSettingsWithOrder(layoutSettings.pages)) {
    return <Navigate to={layoutSettings.pages.order[0]} replace />;
  }

  if (isPagesSettingsWithGroups(layoutSettings.pages)) {
    return <Navigate to={layoutSettings.pages.groups[0].order[0]} replace />;
  }

  throw new Error('Layout settings has no page order or groups');
};
