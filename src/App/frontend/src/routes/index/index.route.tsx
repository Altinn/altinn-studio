import React from 'react';
import { Outlet } from 'react-router';

import { FormProvider } from 'src/features/form/FormContext';

export const Component = () => (
  <FormProvider>
    <Outlet />
  </FormProvider>
);
