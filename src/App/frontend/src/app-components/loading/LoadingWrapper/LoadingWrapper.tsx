import React from 'react';
import type { HTMLAttributes, PropsWithChildren } from 'react';

/**
 * The `data-loading` signals that something is pending and we should not print PDF yet.
 */
export function LoadingWrapper({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      data-loading
      {...props}
    >
      {children}
    </div>
  );
}
