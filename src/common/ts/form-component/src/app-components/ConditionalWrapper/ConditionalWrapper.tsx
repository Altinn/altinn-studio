import type { JSX, PropsWithChildren, ReactNode } from 'react';

interface IConditionalWrapperProps {
  condition: boolean;
  wrapper: (children: ReactNode) => JSX.Element;
  otherwise?: (children: ReactNode) => JSX.Element;
}

export const ConditionalWrapper = ({
  condition,
  wrapper,
  otherwise,
  children,
}: PropsWithChildren<IConditionalWrapperProps>) => {
  if (condition) {
    return wrapper(children);
  } else if (otherwise) {
    return otherwise(children);
  } else {
    return children;
  }
};
