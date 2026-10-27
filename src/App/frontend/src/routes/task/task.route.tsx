import React from 'react';
import { Outlet } from 'react-router';

import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { FormProvider } from 'src/features/form/FormProvider';
import { PdfWrapper, useIsSubformPdf } from 'src/features/pdf/PdfWrapper';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { clientLoader } from 'src/routes/task/task.loader';

export { clientLoader };

export default function Task() {
  // A subform PDF task may keep a UI folder of its own, such as one with a waiting page, but its PDF renders an entry
  // from the subform's UI folder. Loading the task's own form would load the wrong folder, or fail on its data type.
  const isSubformPdf = useIsSubformPdf();
  if (isSubformPdf) {
    return <PdfWrapper />;
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
