import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import cn from 'classnames';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useGetTaskTypeById } from 'src/features/instance/useProcessQuery';
import { PdfForServiceTask, PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import classes from 'src/features/pdf/PDFView.module.css';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { ProcessTaskType } from 'src/types';

export const usePdfModeActive = (): boolean => {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const pdfIsSetInUrl = useIsPdf();
  return pdfIsSetInUrl || previewPDF;
};

export function PdfWrapper({ children }: PropsWithChildren) {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);
  const renderInstead = useIsPdf();

  const taskId = useNavigationParam('taskId');
  const taskType = useGetTaskTypeById()(taskId);

  useEffect(() => {
    if (previewPDF) {
      waitForPrint().then((success) => {
        if (success) {
          window.print();
        } else {
          window.logWarn('PDF preview timed out');
        }
        setPdfPreview(false);
      });
    }
  }, [previewPDF, setPdfPreview]);

  const PdfComponent = taskType === ProcessTaskType.Service ? PdfForServiceTask : PdfFromLayout;

  if (renderInstead) {
    return <PdfComponent />;
  }

  return (
    <>
      <div className={cn({ [classes.hideInPrint]: previewPDF })}>{children}</div>

      {previewPDF && (
        <div className={classes.onlyInPrint}>
          <PdfComponent />
        </div>
      )}
    </>
  );
}

async function waitForPrint(timeOut = 5000): Promise<boolean> {
  const start = performance.now();
  while (document.querySelector('#readyForPrint') === null) {
    if (performance.now() - start > timeOut) {
      return false;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return true;
}
