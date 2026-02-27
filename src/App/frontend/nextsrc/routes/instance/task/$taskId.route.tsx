import React from 'react';
import { useParams } from 'react-router';

import { GlobalData } from 'nextsrc/core/globalData';

export const Task = () => {
  const { taskId } = useParams<{ taskId: string }>();

  if (!taskId) {
    return undefined;
  }

  const ourUiFolder = GlobalData.ui.folders[taskId];
  return (
    <div>
      I am Task: {taskId}
      <pre>{JSON.stringify(ourUiFolder, null, 2)}</pre>
    </div>
  );
};
