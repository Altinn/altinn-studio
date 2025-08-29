import type { FieldsetProps } from '@digdir/designsystemet-react';
import { Fieldset } from '@digdir/designsystemet-react';
import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioPropertyFieldset.module.css';

export type StudioPropertyFieldsetProps = FieldsetProps & {
  menubar?: ReactNode;
  compact?: boolean;
};

const StudioPropertyFieldset = forwardRef<HTMLFieldSetElement, StudioPropertyFieldsetProps>(
  ({ menubar, children, className: givenClass, compact, ...props }, ref) => {
    const className = cn(givenClass, classes.propertyFieldset, compact && classes.compact);
    return (
      <Fieldset size='small' {...props} className={className} ref={ref}>
        <div className={classes.menubar} role='menubar'>
          {menubar}
        </div>
        <div className={classes.content}>{children}</div>
      </Fieldset>
    );
  },
);

StudioPropertyFieldset.displayName = 'StudioProperty.Fieldset';

export { StudioPropertyFieldset };
