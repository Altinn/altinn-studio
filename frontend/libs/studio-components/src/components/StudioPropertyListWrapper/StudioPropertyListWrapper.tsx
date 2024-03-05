import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioPropertyListWrapper.module.css';

export type StudioPropertyListWrapperProps = HTMLAttributes<HTMLDivElement> & {
  withoutNegativeMargin?: boolean;
};

const StudioPropertyListWrapper = forwardRef<HTMLDivElement, StudioPropertyListWrapperProps>(
  ({ className: givenClass, children, ...rest }, ref) => {
    const className = cn(givenClass, classes.listWrapper);
    return (
      <div className={className} ref={ref} {...rest}>
        {children}
      </div>
    );
  },
);

StudioPropertyListWrapper.displayName = 'StudioPropertyListWrapper';

export { StudioPropertyListWrapper };
