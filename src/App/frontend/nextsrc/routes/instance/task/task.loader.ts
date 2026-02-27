import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { GlobalData } from 'nextsrc/core/globalData';
import { isPagesSettingsWithGroups, isPagesSettingsWithOrder } from 'nextsrc/core/typeguards';

export const taskLoader = async ({ params }: LoaderFunctionArgs<{ taskId: string }>) => {
  const { taskId } = params;
  if (!taskId) {
    return null;
  }
  const layoutSettings = GlobalData.ui.folders[taskId];

  if (!layoutSettings) {
    throw new Error(`No UI folder for task ${taskId}, this is an error fix it.`);
  }

  if (isPagesSettingsWithOrder(layoutSettings.pages)) {
    return redirect(`${layoutSettings.pages.order[0]}`);
  }

  if (isPagesSettingsWithGroups(layoutSettings.pages)) {
    return redirect(`${layoutSettings.pages.groups[0].order[0]}`);
  }

  return null;
};
