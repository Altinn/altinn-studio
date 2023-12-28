import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { PDFView } from 'src/features/pdf/PDFView';
import { useAppSelector } from 'src/hooks/useAppSelector';

export function PDFWrapper({ children }: PropsWithChildren) {
  const previewPDF = useAppSelector((state) => state.devTools.pdfPreview);
  const [searchParams] = useSearchParams();
  const renderInstead = searchParams.get('pdf') === '1';

  if (renderInstead) {
    return <PDFView />;
  }

  if (previewPDF) {
    return (
      <>
        <div className='hide-form'>{children}</div>
        <PDFView />
      </>
    );
  }

  return <>{children}</>;
}
