import type { JSX, PropsWithChildren } from 'react';
import type React from 'react';

interface IConditionalWrapperProps {
  condition: boolean;
  wrapper: (children: React.ReactNode) => JSX.Element;
}

export const ConditionalWrapper = ({ condition, wrapper, children }: PropsWithChildren<IConditionalWrapperProps>) => {
  if (condition) {
    return wrapper(children);
  } else {
    return children;
  }
};
