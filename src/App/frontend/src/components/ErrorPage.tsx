import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';

/**
 * Error element for react-router routes.
 * Catches errors thrown in loaders, actions, or during rendering of route components.
 */
export function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <UnknownError />;
  }

  if (error instanceof Error) {
    return <DisplayError error={error} />;
  }

  return <UnknownError />;
}
