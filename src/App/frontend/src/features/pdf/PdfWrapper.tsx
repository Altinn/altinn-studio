import React from 'react';
import type { PropsWithChildren } from 'react';

import { useGetTaskTypeById } from 'src/features/instance/useProcessQuery';
import { PdfForServiceTask, PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ProcessTaskType } from 'src/types';

export const usePdfModeActive = useIsPdf;

export function PdfWrapper({ children }: PropsWithChildren) {
  const renderInstead = useIsPdf();

  const taskId = useNavigationParam('taskId');
  const taskType = useGetTaskTypeById()(taskId);

  const PdfComponent = taskType === ProcessTaskType.Service ? PdfForServiceTask : PdfFromLayout;

  if (renderInstead) {
    return <PdfComponent />;
  }

  return children;
}
