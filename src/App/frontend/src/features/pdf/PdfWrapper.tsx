import React from 'react';
import type { PropsWithChildren } from 'react';

import { getUiFolderSettings } from 'src/features/form/ui';
import { useGetTaskTypeById, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { PdfForServiceTask, PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ProcessTaskType } from 'src/types';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { IProcess } from 'src/types/shared';

export const usePdfModeActive = useIsPdf;

export function PdfWrapper({ children }: PropsWithChildren) {
  const renderInstead = useIsPdf();

  const taskId = useNavigationParam('taskId');
  const taskType = useGetTaskTypeById()(taskId);
  const { data: process } = useProcessQuery();

  const PdfComponent = rendersAutomaticPdf(process, taskId, taskType) ? PdfForServiceTask : PdfFromLayout;

  if (renderInstead) {
    return <PdfComponent />;
  }

  return children;
}

/**
 * Whether the task's PDF is the automatic PDF of the tasks passed as `task` search params, rather than one drawn
 * from the task's own UI folder. A PDF service task draws its folder's `pdfLayoutName` when it is set, and the
 * automatic PDF otherwise, whether or not the folder exists. Any other task draws the automatic PDF only when it
 * counts as a service task without a page.
 */
export function rendersAutomaticPdf(
  process: IProcess | undefined,
  taskId: string | undefined,
  taskType: ProcessTaskType,
): boolean {
  const fromList = process?.processTasks?.find((t) => t.elementId === taskId);
  const fromCurrent = process?.currentTask?.elementId === taskId ? process?.currentTask : undefined;
  const elementType = fromList?.elementType ?? fromCurrent?.elementType;
  const altinnTaskType = fromList?.altinnTaskType ?? fromCurrent?.altinnTaskType;

  if (elementType === ELEMENT_TYPE.SERVICE_TASK && altinnTaskType === 'pdf') {
    return !getUiFolderSettings(taskId)?.pages.pdfLayoutName?.trim();
  }

  return taskType === ProcessTaskType.Service;
}
