import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useLayouts } from 'nextsrc/http-client/api-client/queries/layouts';
import { RenderLayout } from 'nextsrc/render-logic/RenderLayout';

import type { ILayoutFile, ILayoutSets } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';

export type PageParams = {
  pageKey: string;
  taskId: string;
};

export function getLayoutSetIdForTask(layoutSets: ILayoutSets | undefined, taskId: string): string | undefined {
  return layoutSets?.sets.find((layoutSet) => layoutSet.tasks?.includes(taskId))?.id;
}

export function getCurrentLayout(
  layoutSets: ILayoutSets | undefined,
  layouts: ILayoutCollection | undefined,
  taskId: string,
  pageKey: string,
): ILayoutFile {
  const layoutSetId = getLayoutSetIdForTask(layoutSets, taskId);
  if (!layoutSetId) {
    throw new Error(`No layout set found for task: ${taskId}`);
  }

  if (!layouts) {
    throw new Error(`No layouts found for layout set: ${layoutSetId}`);
  }

  const currentLayout = layouts[pageKey];
  if (!currentLayout) {
    throw new Error(`No layout found for page: ${pageKey}`);
  }

  return currentLayout;
}

export function useGetCurrentLayout() {
  const { pageKey } = useParams<PageParams>() as Required<PageParams>;
  const layoutSets = window.AltinnAppInstanceData?.layoutSets;

  return useCallback(
    (taskId: string, layouts: ILayoutCollection | undefined): ILayoutFile =>
      getCurrentLayout(layoutSets, layouts, taskId, pageKey),
    [layoutSets, pageKey],
  );
}

export const NextForm: React.FunctionComponent = () => {
  const { taskId } = useParams<PageParams>() as Required<PageParams>;

  const layoutSetId = getLayoutSetIdForTask(window.AltinnAppInstanceData?.layoutSets, taskId);
  if (!layoutSetId) {
    throw new Error('No layout set found for task');
  }

  const layouts = useLayouts({ layoutSetId });
  const getLayout = useGetCurrentLayout();
  const currentLayout = getLayout(taskId, layouts);

  return (
    <div>
      <RenderLayout layout={currentLayout} />
    </div>
  );
};

// import React from 'react';
// import { useParams } from 'react-router-dom';
//
// import { useLayouts } from 'src/http-client/api-client/queries/layouts';
// import { RenderLayout } from 'src/next/RenderLayout';
//
// export type PageParams = {
//   pageKey: string;
//   taskId: string;
// };
//
// export const NextForm: React.FunctionComponent = () => {
//   const { pageKey, taskId } = useParams<PageParams>() as Required<PageParams>;
//
//   const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets.sets.find((layoutSet) =>
//     layoutSet.tasks?.includes(taskId),
//   );
//   if (!currentLayoutSet) {
//     throw new Error('something is wrong');
//   }
//
//   const layouts = useLayouts({ layoutSetId: currentLayoutSet.id });
//
//   if (!layouts) {
//     throw new Error('something is wrong layouts');
//   }
//
//   const currentLayout = layouts[pageKey];
//   if (!currentLayout) {
//     throw new Error('something is wrong components');
//   }
//   return (
//     <div>
//       <RenderLayout layout={currentLayout} />
//     </div>
//   );
// };
