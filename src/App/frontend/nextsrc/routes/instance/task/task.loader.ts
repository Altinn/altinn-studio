import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { LayoutApi } from 'nextsrc/core/apiClient/layoutApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { isPagesSettingsWithGroups, isPagesSettingsWithOrder } from 'nextsrc/core/typeguards';

export const taskLoader = async ({ params }: LoaderFunctionArgs<{ taskId: string }>) => {
  const { taskId } = params;
  if (!taskId) {
    return null;
  }
  const layoutSet = GlobalData.layoutSetByTaskId(taskId);

  if (!layoutSet) {
    throw new Error('layoutSet is undefined, this is an error fix it.');
  }

  const layoutSettings = await LayoutApi.getLayoutSettings(layoutSet.id);

  if (!layoutSettings) {
    throw new Error('layoutSettings is undefined, this is an error fix it.');
  }
  if (isPagesSettingsWithOrder(layoutSettings.pages)) {
    return redirect(`${layoutSettings.pages.order[0]}`);
  }

  if (isPagesSettingsWithGroups(layoutSettings.pages)) {
    return redirect(`${layoutSettings.pages.groups[0].order[0]}`);
  }

  return null;
};
