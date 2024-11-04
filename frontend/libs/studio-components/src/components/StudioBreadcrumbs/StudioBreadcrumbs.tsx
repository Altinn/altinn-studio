import React from 'react';
import { type HTMLAttributes, forwardRef } from 'react';
import classes from './StudioBreadcrumbs.module.css';

export type StudioBreadcrumbsProps = {
  'aria-label'?: string;
} & HTMLAttributes<HTMLElement>;

const StudioBreadcrumbs = forwardRef<HTMLElement, StudioBreadcrumbsProps>(
  ({ 'aria-label': ariaLabel = 'You are here:', className, ...rest }, ref) => (
    <nav
      aria-label={ariaLabel}
      className={`${classes['ds-breadcrumbs']} ${className}`}
      ref={ref}
      {...rest}
    />
  ),
);

StudioBreadcrumbs.displayName = 'StudioBreadcrumbs';

export { StudioBreadcrumbs };
