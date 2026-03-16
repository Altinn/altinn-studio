import React from 'react';
import type { HTMLAttributes, PropsWithChildren } from 'react';

/**
 * The `data-fatal-error` signals that some unrecoverable error occured which should prevent PDF generation from happening as it would not include necessary information.
 */
export function FatalError({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      data-fatal-error
      {...props}
    >
      {children}
    </div>
  );
}
