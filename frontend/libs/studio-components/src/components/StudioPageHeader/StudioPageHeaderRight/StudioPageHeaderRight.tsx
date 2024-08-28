import React, { type ReactNode, type ReactElement } from 'react';

type StudioPageHeaderRightProps = {
  children: ReactNode;
};

export const StudioPageHeaderRight = ({ children }: StudioPageHeaderRightProps): ReactElement => {
  return <div>{children}</div>;
};
