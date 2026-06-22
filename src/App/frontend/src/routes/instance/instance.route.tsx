import React from 'react';
import { Outlet, useRouteError } from 'react-router';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { isAxiosError } from 'src/utils/isAxiosError';
import { isAuthenticationRedirectError } from 'src/utils/maybeAuthenticationRedirect';

export function Component() {
  return (
    <InstanceProvider>
      <Outlet />
    </InstanceProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isAuthenticationRedirectError(error)) {
    return <Loader reason='authentication-redirect' />;
  }

  const displayError = error instanceof Error || isAxiosError(error) ? error : new Error(String(error));
  return <DisplayError error={displayError} />;
}
