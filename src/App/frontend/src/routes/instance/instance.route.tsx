import React from 'react';
import { Outlet, useRouteError } from 'react-router';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { isAxiosError } from 'src/utils/isAxiosError';

export function Component() {
  return (
    <InstanceProvider>
      <Outlet />
    </InstanceProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const displayError = error instanceof Error || isAxiosError(error) ? error : new Error(String(error));
  return <DisplayError error={displayError} />;
}

