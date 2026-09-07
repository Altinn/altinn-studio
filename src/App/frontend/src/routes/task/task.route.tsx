import React from 'react';
import { Outlet, useSearchParams } from 'react-router';

import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { FormProvider } from 'src/features/form/FormProvider';
import { getPdfRenderContext } from 'src/features/pdf/pdfRenderContext';
import { PdfRenderEntry } from 'src/features/pdf/PdfRenderEntry';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { clientLoader } from 'src/routes/task/task.loader';

export { clientLoader };

export default function Task() {
  const [params] = useSearchParams();
  const pdfContext = getPdfRenderContext(params);
  if (pdfContext) {
    return <PdfRenderEntry {...pdfContext} />;
  }

  return (
    <FixWrongReceiptType>
      <ProcessWrapper>
        <FormProvider>
          <Outlet />
        </FormProvider>
      </ProcessWrapper>
    </FixWrongReceiptType>
  );
}
