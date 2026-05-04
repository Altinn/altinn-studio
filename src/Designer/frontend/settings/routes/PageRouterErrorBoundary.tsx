import type { ReactElement } from 'react';
import { StudioPageError } from 'app-shared/components';

export const ErrorBoundary = (): ReactElement => {
  return <StudioPageError />;
};

export const AppRouteErrorBoundary = ErrorBoundary;
export const NotFoundRouteErrorBoundary = ErrorBoundary;
export const RouteErrorBoundary = ErrorBoundary;
