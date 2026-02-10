import React from 'react';
import { useParams } from 'react-router-dom';

export const Page = () => {
  const { pageId } = useParams<{ pageId: string }>();

  if (!pageId) {
    return undefined;
  }

  // const ourLayoutSet = GlobalData.layoutSets?.sets.find((layoutSet) => layoutSet.tasks?.includes(taskId));
  // ourLayoutSet.id;
  return <div>I am Page: {pageId}</div>;
};
