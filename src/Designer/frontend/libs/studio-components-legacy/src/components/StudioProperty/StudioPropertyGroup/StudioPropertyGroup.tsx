import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioPropertyGroup.module.css';

export type StudioPropertyGroupProps = HTMLAttributes<HTMLDivElement> & {
  withoutNegativeMargin?: boolean;
};

const StudioPropertyGroup = forwardRef<HTMLDivElement, StudioPropertyGroupProps>(
  ({ className: givenClass, children, ...rest }, ref) => {
    const className = cn(givenClass, classes.listWrapper);
    return (
      <div className={className} ref={ref} {...rest}>
        {children}
      </div>
    );
  },
);

StudioPropertyGroup.displayName = 'StudioProperty.Group';

export { StudioPropertyGroup };
