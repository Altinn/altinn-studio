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

  // A 403 with RequiredAuthenticationLevel triggers a step-up redirect (see useInstantiation.onError). Block further
  // rendering with a loader until the browser navigates away, so we never flash the "missing roles" error page. After a
  // successful step-up the level is raised, so a later 403 no longer carries RequiredAuthenticationLevel and the error
  // page renders below instead.
  if (isAuthenticationRedirectError(error)) {
    return <Loader reason='authentication-redirect' />;
  }

  const displayError = error instanceof Error || isAxiosError(error) ? error : new Error(String(error));
  return <DisplayError error={displayError} />;
}
