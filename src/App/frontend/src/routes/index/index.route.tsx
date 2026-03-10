import React from 'react';
import { Outlet, useLoaderData } from 'react-router';

import { FormProvider } from 'src/features/form/FormContext';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import type { IndexLoaderResult } from 'src/routes/index/index.loader';

export const Component = () => {
  const loaderData = useLoaderData<IndexLoaderResult>();

  if (loaderData?.error === 'forbidden-validation') {
    return <InstantiateValidationError validationResult={loaderData.validationResult} />;
  }

  if (loaderData?.error === 'forbidden') {
    return <MissingRolesError />;
  }

  if (loaderData?.error === 'unknown') {
    return <UnknownError />;
  }

  return (
    <FormProvider>
      <Outlet />
    </FormProvider>
  );
};
