import { type HTMLAttributes, forwardRef } from 'react';
import React from 'react';

export type StudioBreadcrumbsItemProps = HTMLAttributes<HTMLLIElement>;

export const StudioBreadcrumbsItem = forwardRef<HTMLLIElement, StudioBreadcrumbsItemProps>(
  function BreadcrumbsItem({ className, ...rest }, ref) {
    return <li ref={ref} {...rest} />;
  },
);
