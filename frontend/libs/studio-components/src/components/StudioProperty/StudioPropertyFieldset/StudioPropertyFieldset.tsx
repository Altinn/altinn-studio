import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioPropertyFieldset.module.css';
import type { StudioFieldsetProps } from '../../StudioFieldset';
import { StudioFieldset } from '../../StudioFieldset';

export type StudioPropertyFieldsetProps = StudioFieldsetProps & {
  menubar?: ReactNode;
  compact?: boolean;
};

const StudioPropertyFieldset = forwardRef<HTMLFieldSetElement, StudioPropertyFieldsetProps>(
  ({ menubar, children, className: givenClass, compact, ...props }, ref) => {
    const className = cn(givenClass, classes.propertyFieldset, compact && classes.compact);
    return (
      <StudioFieldset {...props} className={className} ref={ref}>
        <div className={classes.menubar} role='menubar'>
          {menubar}
        </div>
        <div className={classes.content}>{children}</div>
      </StudioFieldset>
    );
  },
);

StudioPropertyFieldset.displayName = 'StudioProperty.Fieldset';

export { StudioPropertyFieldset };
