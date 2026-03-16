import React from 'react';
import { Outlet } from 'react-router';

import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { FormProvider } from 'src/features/form/FormContext';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';

export function Component() {
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
