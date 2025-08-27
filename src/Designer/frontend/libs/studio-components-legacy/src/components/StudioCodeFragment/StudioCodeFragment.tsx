import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioCodeFragment.module.css';

export type StudioCodeFragmentProps = HTMLAttributes<HTMLElement>;

/**
 * @deprecated use `StudioCodeFragment` from `@studio/components` instead
 */

const StudioCodeFragment = forwardRef<HTMLElement, StudioCodeFragmentProps>(
  ({ children, className: givenClass, ...rest }, ref) => {
    const className = cn(classes.code, givenClass);

    return (
      <code className={className} {...rest} ref={ref}>
        {children}
      </code>
    );
  },
);

StudioCodeFragment.displayName = 'StudioCodeFragment';

export { StudioCodeFragment };
