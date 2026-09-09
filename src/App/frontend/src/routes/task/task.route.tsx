import React from 'react';
import { Outlet } from 'react-router';

import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { FormProvider } from 'src/features/form/FormProvider';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { clientLoader } from 'src/routes/task/task.loader';

export { clientLoader };

export default function Task() {
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
