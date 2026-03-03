import React from 'react';

import { Alert as DsAlert } from '@digdir/designsystemet-react';

interface RootErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const isDev = process.env.NODE_ENV === 'development';

export const RootErrorFallback = ({ error, reset }: RootErrorFallbackProps) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
    }}
  >
    <div style={{ maxWidth: '600px', width: '100%' }}>
      <DsAlert data-color='danger'>
        <strong>An unexpected error occurred</strong>
        {isDev && <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{error.message}</p>}
        <p style={{ marginTop: '1rem' }}>
          <button type='button' onClick={reset}>
            Try again
          </button>
        </p>
      </DsAlert>
    </div>
  </div>
);
