import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import cn from 'classnames';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { PDFView } from 'src/features/pdf/PDFView';
import classes from 'src/features/pdf/PDFView.module.css';
import { PDFView2 } from 'src/features/pdf/PdfView2';
import { getFeature } from 'src/features/toggles';
import { useIsPdf } from 'src/hooks/useIsPdf';

export const usePdfModeActive = (): boolean => {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const pdfIsSetInUrl = useIsPdf();
  return pdfIsSetInUrl || previewPDF;
};

export function PDFWrapper({ children }: PropsWithChildren) {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);
  const renderInstead = useIsPdf();
  const betaPDFenabled = getFeature('betaPDFenabled');

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

  if (renderInstead && betaPDFenabled.value) {
    return <PDFView2 />;
  }

  if (renderInstead) {
    return <PDFView />;
  }

  return (
    <>
      <div className={cn({ [classes.hideInPrint]: previewPDF })}>{children}</div>

      {previewPDF && (
        <div className={classes.onlyInPrint}>
          {betaPDFenabled.value && <PDFView2 />}
          {!betaPDFenabled.value && <PDFView />}
        </div>
      )}
    </>
  );
}

async function waitForPrint(timeOut = 5000): Promise<boolean> {
  const start = performance.now();
  while (document.querySelector('#pdfView #readyForPrint') === null) {
    if (performance.now() - start > timeOut) {
      return false;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return true;
}
