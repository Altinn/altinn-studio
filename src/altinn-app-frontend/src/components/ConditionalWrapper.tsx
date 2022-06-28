import type React from "react";

interface IConditionalWrapperProps {
  condition: boolean;
  wrapper: (children: React.ReactNode) => JSX.Element;
  children: JSX.Element;
}

export const ConditionalWrapper = ({
  condition,
  wrapper,
  children,
}: IConditionalWrapperProps) => {
  if (condition) {
    return wrapper(children);
  } else {
    return children;
  }
};
