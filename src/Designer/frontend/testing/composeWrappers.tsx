import type { ReactNode } from 'react';
import React from 'react';

export type WrapperFunction = (children: ReactNode) => ReactNode;

/**
 * Composes an array of wrapper functions into a single React wrapper component.
 * Wrappers are applied outermost-first: index 0 becomes the outermost provider.
 */
export function composeWrappers(
  wrapperFunctions: WrapperFunction[],
): React.FC<{ children: ReactNode }> {
  const ComposedWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    const composed = wrapperFunctions.reduceRight<ReactNode>(
      (accumulatedChildren, wrapperFunction) => wrapperFunction(accumulatedChildren),
      children,
    );
    return <>{composed}</>;
  };
  ComposedWrapper.displayName = 'ComposedWrapper';
  return ComposedWrapper;
}
