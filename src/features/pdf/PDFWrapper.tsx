import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { PDFView } from 'src/features/pdf/PDFView';
import classes from 'src/features/pdf/PDFView.module.css';

export function PDFWrapper({ children }: PropsWithChildren) {
  const previewPDF = useDevToolsStore((state) => state.pdfPreview);
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);
  const [searchParams] = useSearchParams();
  const renderInstead = searchParams.get('pdf') === '1';

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

  if (renderInstead) {
    return <PDFView />;
  }

  if (previewPDF) {
    return (
      <>
        <div className={classes['hide-form']}>{children}</div>
        <PDFView />
      </>
    );
  }

  return <>{children}</>;
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
