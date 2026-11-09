import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import cn from 'classnames';

import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { FormProvider } from 'src/features/form/FormContext';
import { useCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { PdfForServiceTask, PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import classes from 'src/features/pdf/PDFView.module.css';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';

export const usePdfModeActive = (): boolean => {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const pdfIsSetInUrl = useIsPdf();
  return pdfIsSetInUrl || previewPDF;
};

export function PdfWrapper({ children, isTaskRoute = false }: PropsWithChildren<{ isTaskRoute?: boolean }>) {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);
  const renderInstead = useIsPdf();

  const componentId = useNavigationParam('componentId');
  const taskId = useNavigationParam('taskId');
  const layoutSet = useCurrentLayoutSet(taskId);
  const requestedElementId = useNavigationParam('dataElementId');
  const dataElementId = useInstanceDataElements(layoutSet?.dataType).find((e) => e.id === requestedElementId)?.id;

  useEffect(() => {
    if (previewPDF && !isTaskRoute) {
      waitForPrint().then((success) => {
        if (success) {
          window.print();
        } else {
          window.logWarn('PDF preview timed out');
        }
        setPdfPreview(false);
      });
    }
  }, [previewPDF, setPdfPreview, isTaskRoute]);

  const PdfComponent = layoutSet ? PdfFromLayout : PdfForServiceTask;

  if (renderInstead) {
    if (isTaskRoute && layoutSet) {
      // PDF requests select their rendering context independently of the active process task.
      // Subforms keep using component routing to select their layout and data element.
      return (
        <TaskOverrides
          taskId={taskId}
          dataModelType={layoutSet?.dataType}
          dataModelElementId={dataElementId}
        >
          <FormProvider readOnly>{componentId ? <Outlet /> : <PdfComponent />}</FormProvider>
        </TaskOverrides>
      );
    }
    return <PdfComponent />;
  }

  // The task-route wrapper only intercepts PDF requests. Developer previews render inside the form.
  if (isTaskRoute) {
    return children;
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
