import React from 'react';
import { type HTMLAttributes, forwardRef } from 'react';
import classes from './StudioBreadcrumbs.module.css';

export type StudioBreadcrumbsProps = {
  'aria-label'?: string;
} & HTMLAttributes<HTMLElement>;

export const defaultAriaLabel = 'You are here:';

const StudioBreadcrumbs = forwardRef<HTMLElement, StudioBreadcrumbsProps>(
  ({ 'aria-label': ariaLabel = defaultAriaLabel, className, ...rest }, ref) => (
    <nav
      aria-label={ariaLabel}
      className={`${classes.dsBreadcrumbs} ${className}`}
      ref={ref}
      {...rest}
    />
  ),
);

StudioBreadcrumbs.displayName = 'StudioBreadcrumbs';

export { StudioBreadcrumbs };
