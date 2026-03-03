import React from 'react';
import type { ReactNode } from 'react';

import { Alert as DsAlert } from '@digdir/designsystemet-react';

import { ErrorBoundary } from 'nextsrc/core/ErrorBoundary';

interface ComponentErrorBoundaryProps {
  componentId: string;
  componentType: string;
  children: ReactNode;
}

const isDev = process.env.NODE_ENV === 'development';

export const ComponentErrorBoundary = ({ componentId, componentType, children }: ComponentErrorBoundaryProps) => (
  <ErrorBoundary
    fallback={(error, reset) => (
      <DsAlert data-color='danger'>
        {isDev ? (
          <>
            <strong>
              Component error: {componentType} ({componentId})
            </strong>
            <p>{error.message}</p>
          </>
        ) : (
          <p>Something went wrong while rendering this component.</p>
        )}
        <button type='button' onClick={reset}>
          Try again
        </button>
      </DsAlert>
    )}
  >
    {children}
  </ErrorBoundary>
);
