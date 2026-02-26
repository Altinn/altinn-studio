import React from 'react';

/**
 * The `data-loading` signals that something is pending and we should not print PDF yet.
 */
export function LoadingEmpty() {
  return (
    <div
      data-loading
      style={{ display: 'none' }}
    />
  );
}
