import React, { type ReactNode, type ReactElement } from 'react';

export type StudioPageHeaderCenterProps = {
  children: ReactNode;
};

export const StudioPageHeaderCenter = ({ children }: StudioPageHeaderCenterProps): ReactElement => {
  return <div>{children}</div>;
};
