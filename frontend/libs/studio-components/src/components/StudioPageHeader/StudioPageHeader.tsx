import React, { type ReactNode } from 'react';
import classes from './StudioPageHeader.module.css';
import cn from 'classnames';
import { DigdirLogoLink } from './DigdirLogoLink';
import { type StudioPageHeaderVariant } from './types/StudioPageHeaderVariant';
import { StudioPageHeaderContextProvider, useStudioPageHeaderContext } from './context';

// TODO - Should we split this file into smaller files?
export type StudioPageHeaderProps = {
  children: ReactNode;
  variant?: StudioPageHeaderVariant;
};

export const StudioPageHeader = ({
  children,
  variant = 'regular',
}: StudioPageHeaderProps): React.ReactElement => {
  return (
    <StudioPageHeaderContextProvider variant={variant}>
      <div role='banner' className={classes.studioPageHeader}>
        {children}
      </div>
    </StudioPageHeaderContextProvider>
  );
};

export type StudioPageHeaderComponentProps = {
  children?: ReactNode;
};

export const StudioPageHeaderMain = ({
  children,
}: StudioPageHeaderComponentProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();
  return <div className={cn(classes.main, classes[variant])}>{children}</div>;
};

export type StudioPageHeaderLeftProps = {
  children?: ReactNode;
  title?: string;
};

export const StudioPageHeaderLeft = ({
  children,
  title,
}: StudioPageHeaderLeftProps): React.ReactElement => {
  if (children) return <div>{children}</div>;
  return <DigdirLogoLink title={title} />;
};

export const StudioPageHeaderCenter = ({
  children,
}: StudioPageHeaderComponentProps): React.ReactElement => {
  return <div>{children}</div>;
};

export const StudioPageHeaderRight = ({
  children,
}: StudioPageHeaderComponentProps): React.ReactElement => {
  return <div>{children}</div>;
};

export const StudioPageHeaderSub = ({
  children,
}: StudioPageHeaderComponentProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();

  return <div className={cn(classes.sub, classes[`${variant}Sub`])}>{children}</div>;
};
