import React from 'react';

/**
 * The `data-fatal-error` signals that some unrecoverable error occured which should prevent PDF generation from happening as it would not include necessary information.
 */
export function FatalErrorEmpty() {
  return (
    <div
      data-fatal-error
      style={{ display: 'none' }}
    />
  );
}
