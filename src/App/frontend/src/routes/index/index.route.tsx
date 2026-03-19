import React from 'react';
import { Outlet, useLoaderData } from 'react-router';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { FormProvider } from 'src/features/form/FormContext';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import type { IndexLoaderResult } from 'src/routes/index/index.loader';

export const Component = () => {
  const loaderData = useLoaderData<IndexLoaderResult>();

  if (loaderData?.error === 'forbidden') {
    return <MissingRolesError />;
  }

  if (loaderData?.error === 'forbidden-validation') {
    return <InstantiateValidationError validationResult={loaderData.validationResult} />;
  }

  if (loaderData?.error === 'instantiation-failed') {
    return <DisplayError error={loaderData.cause} />;
  }

  return (
    <FormProvider>
      <Outlet />
    </FormProvider>
  );
};
