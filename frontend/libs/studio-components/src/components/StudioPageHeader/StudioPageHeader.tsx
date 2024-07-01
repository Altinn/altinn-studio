import React, { type ReactNode } from 'react';
import classes from './StudioPageHeader.module.css';
import cn from 'classnames';

export type StudioPageHeaderVariant = 'regular' | 'preview';

export type StudioPageHeaderProps = {
  children: ReactNode;
};

export const StudioPageHeader = ({ children }: StudioPageHeaderProps): React.ReactElement => {
  return <div role='banner'>{children}</div>;
};

export type StudioPageHeaderMainProps = {
  children: ReactNode;
  variant: StudioPageHeaderVariant;
};

export const StudioPageHeaderMain = ({
  children,
  variant,
}: StudioPageHeaderMainProps): React.ReactElement => {
  return <div className={cn(classes.main, classes[variant])}>{children}</div>;
};

export type StudioPageHeaderComponentProps = {
  children: ReactNode;
};

export const StudioPageHeaderLeft = ({
  children,
}: StudioPageHeaderComponentProps): React.ReactElement => {
  return <div>{children}</div>;
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
  return <div className={classes.sub}>{children}</div>;
};

// Need to create
// - StudioLogoLink
// - StudioProfileMenu
// - StudioSubHeader (.Left, .Right)

// Need to split the code above into separate files
// Need to style header differently based on if center is present or not.
// - Always keep logo and profile out on the sides

/*
<StudioPageHeader>
   <StudioPageHeader.Main>
      <StudioPageHeader.Left />
      <StudioPageHeader.Center />
      <StudioPageHeader.Right />
   </StudioPageHeader.Main>
   <StudioPageHeader.Sub>
      Sub header komponent kommer inn her
   </StudioPageHeader.Sub>
</StudioPageHeader>
*/
