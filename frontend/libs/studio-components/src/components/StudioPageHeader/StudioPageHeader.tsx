import React, { type ReactNode } from 'react';
import classes from './StudioPageHeader.module.css';
import cn from 'classnames';
import { DigdirLogoLink } from './DigdirLogoLink';
import { type StudioPageHeaderVariant } from './types/StudioPageHeaderVariant';
import { StudioPageHeaderContextProvider, useStudioPageHeaderContext } from './context';

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

export type StudioPageHeaderWrapperProps = {
  children: ReactNode;
};

export const StudioPageHeaderMain = ({
  children,
}: StudioPageHeaderWrapperProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();
  return <div className={cn(classes.main, classes[variant])}>{children}</div>;
};

export type StudioPageHeaderComponentProps = {
  children?: ReactNode;
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
}: StudioPageHeaderWrapperProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();

  return <div className={cn(classes.sub, classes[`${variant}Sub`])}>{children}</div>;
};

// Need to create
// - StudioProfileMenu
// - StudioNavigationButton
// - StudioNavigation

// Need to make mdx and stories file etc.
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
