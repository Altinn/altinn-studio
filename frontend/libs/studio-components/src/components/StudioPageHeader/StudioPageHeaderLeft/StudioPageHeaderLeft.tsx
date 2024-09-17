import React, { type ReactNode, type ReactElement } from 'react';
import { DigdirLogoLink } from './DigdirLogoLink';

export type StudioPageHeaderLeftProps = {
  children?: ReactNode;
  title?: string;
};

export const StudioPageHeaderLeft = ({
  children,
  title,
}: StudioPageHeaderLeftProps): ReactElement => {
  if (children) return <div>{children}</div>;
  return <DigdirLogoLink title={title} />;
};
