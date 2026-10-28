import React from 'react';
import type { PropsWithChildren } from 'react';

import { getUiFolderSettings } from 'src/features/form/ui';
import { findProcessTask, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { PdfForServiceTask, PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IProcess } from 'src/types/shared';

export const usePdfModeActive = useIsPdf;

export function PdfWrapper({ children }: PropsWithChildren) {
  const renderInstead = useIsPdf();

  const taskId = useNavigationParam('taskId');
  const { data: process } = useProcessQuery();

  const PdfComponent = getPdfSource(process, taskId) === 'automatic' ? PdfForServiceTask : PdfFromLayout;

  if (renderInstead) {
    return <PdfComponent />;
  }

  return children;
}

/**
 * Where the task's PDF comes from: the layout its UI folder renders, or the automatic PDF of the tasks passed as `task`
 * search params. A PDF service task's PDF is its folder's `pdfLayoutName` when that is set, and the automatic PDF
 * otherwise, whether or not the folder exists: the pages in its order are a waiting page, never PDF content. Any other
 * service task without a UI folder gets the automatic PDF, and any other task the layout of its folder.
 */
export function getPdfSource(process: IProcess | undefined, taskId: string | undefined): 'layout' | 'automatic' {
  const task = findProcessTask(process, taskId);
  const settings = getUiFolderSettings(taskId);
  if (task?.elementType !== ELEMENT_TYPE.SERVICE_TASK) {
    return 'layout';
  }
  if (task.altinnTaskType === 'pdf') {
    return settings?.pages.pdfLayoutName?.trim() ? 'layout' : 'automatic';
  }
  return settings ? 'layout' : 'automatic';
}
