import React from 'react';
import { useParams } from 'react-router-dom';

import { useLayouts } from 'src/http-client/api-client/queries/layouts';
import { RenderLayout } from 'src/next/RenderLayout';

export type PageParams = {
  pageKey: string;
  taskId: string;
};

export const NextForm: React.FunctionComponent = () => {
  const { pageKey, taskId } = useParams<PageParams>() as Required<PageParams>;

  const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets.sets.find((layoutSet) =>
    layoutSet.tasks?.includes(taskId),
  );
  if (!currentLayoutSet) {
    throw new Error('something is wrong');
  }

  const layouts = useLayouts({ layoutSetId: currentLayoutSet.id });

  if (!layouts) {
    throw new Error('something is wrong layouts');
  }

  const currentLayout = layouts[pageKey];
  if (!currentLayout) {
    throw new Error('something is wrong components');
  }
  return (
    <div>
      <RenderLayout layout={currentLayout} />
    </div>
  );
};
