import React, { type ReactNode, type ReactElement } from 'react';
import { DigdirLogoLink } from './DigdirLogoLink';

export type StudioPageHeaderLeftProps =
  | { children: ReactNode; title?: string; showTitle?: boolean }
  | { children?: ReactNode; title: string; showTitle: boolean };

export const StudioPageHeaderLeft = ({
  children,
  title,
  showTitle = false,
}: StudioPageHeaderLeftProps): ReactElement => {
  if (children) return <div>{children}</div>;
  return <DigdirLogoLink title={title ?? ''} showTitle={showTitle} />;
};
