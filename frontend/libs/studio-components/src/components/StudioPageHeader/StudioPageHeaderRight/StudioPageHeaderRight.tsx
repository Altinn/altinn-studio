import React, { type ReactNode, type ReactElement } from 'react';

export type StudioPageHeaderRightProps = {
  children: ReactNode;
};

export const StudioPageHeaderRight = ({ children }: StudioPageHeaderRightProps): ReactElement => {
  return <div>{children}</div>;
};
