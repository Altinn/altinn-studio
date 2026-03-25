import React from 'react';
import { Outlet, useLoaderData } from 'react-router';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import type { InstanceLoaderResult } from 'src/routes/instance/instance.loader';

export function Component() {
  const loaderData = useLoaderData<InstanceLoaderResult>();

  if (loaderData?.error) {
    return <DisplayError error={loaderData.error} />;
  }

  return (
    <InstanceProvider>
      <Outlet />
    </InstanceProvider>
  );
}
