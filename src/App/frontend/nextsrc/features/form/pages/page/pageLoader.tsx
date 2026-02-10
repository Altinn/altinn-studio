import type { LoaderFunctionArgs } from 'react-router-dom';

import { LayoutApi } from 'nextsrc/core/apiClient/layoutApi';
import { GlobalData } from 'nextsrc/core/globalData';

export const pageLoader = async ({ params }: LoaderFunctionArgs<{ taskId: string; pageId: string }>) => {
  const { pageId, taskId } = params;
  if (!pageId || !taskId) {
    return null;
  }

  const layoutSet = GlobalData.layoutSetByTaskId(taskId);

  if (!layoutSet?.id) {
    throw new Error('No layoutset ID, this is an error');
  }

  const layout = await LayoutApi.getLayout(layoutSet?.id);

  if (!layout) {
    throw new Error('No layout, this is an error');
  }

  return layout;
};
