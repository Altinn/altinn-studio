import React from 'react';
import { useParams } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';

export const Task = () => {
  const { taskId } = useParams<{ taskId: string }>();

  if (!taskId) {
    return undefined;
  }

  const ourLayoutSet = GlobalData.layoutSets?.sets.find((layoutSet) => layoutSet.tasks?.includes(taskId));
  // ourLayoutSet.id;
  return (
    <div>
      I am Task: {taskId}
      <pre>{JSON.stringify(ourLayoutSet, null, 2)}</pre>
    </div>
  );
};
