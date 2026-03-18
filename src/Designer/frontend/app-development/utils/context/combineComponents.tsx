/* eslint-disable react/display-name */
import type { FC, ReactNode } from 'react';

import React from 'react';

type ComponentWithChildren = FC<{ children: ReactNode }>;

/**
 * Combines multiple components (with children) into a single component (with children).
 * @param components - The components to combine.
 * @returns The combined component.
 */
export const combineComponents = (
  ...components: ComponentWithChildren[]
): ComponentWithChildren => {
  return components.reduce(
    (AccumulatedComponents, CurrentComponent) => {
      return ({ children }: { children: ReactNode }): React.ReactElement => {
        return (
          <AccumulatedComponents>
            <CurrentComponent>{children}</CurrentComponent>
          </AccumulatedComponents>
        );
      };
    },
    ({ children }) => <>{children}</>,
  );
};
