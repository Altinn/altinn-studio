import React from 'react';

import { Spinner as DesignSystemSpinner } from '@digdir/designsystemet-react';

/**
 * The `data-loading` signals that something is pending and we should not print PDF yet.
 */
export function Spinner(props: Parameters<typeof DesignSystemSpinner>[0]) {
  return (
    <DesignSystemSpinner
      data-loading
      {...props}
    />
  );
}
