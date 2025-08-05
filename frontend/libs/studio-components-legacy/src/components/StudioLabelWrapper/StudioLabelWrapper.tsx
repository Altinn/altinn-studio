import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioLabelWrapper.module.css';
import cn from 'classnames';

export type StudioLabelWrapperProps = HTMLAttributes<HTMLSpanElement> & {
  withAsterisk?: boolean;
};

/**
 * @deprecated Use `StudioLabelWrapper` from `@studio/components` instead.
 */
const StudioLabelWrapper = forwardRef<HTMLSpanElement, StudioLabelWrapperProps>(
  ({ children, className, withAsterisk, ...rest }, ref) => {
    const finalClassName = cn(
      classes.studioLabelWrapper,
      withAsterisk && classes.withAsterisk,
      className,
    );

    return (
      <span className={finalClassName} {...rest} ref={ref}>
        {children}
      </span>
    );
  },
);

StudioLabelWrapper.displayName = 'StudioLabelWrapper';

export { StudioLabelWrapper };
