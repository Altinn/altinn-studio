import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioCodeFragment.module.css';

export type StudioCodeFragmentProps = HTMLAttributes<HTMLElement> & {
  classname?: string;
};

const StudioCodeFragment = forwardRef<HTMLElement, StudioCodeFragmentProps>(
  ({ children, className: givenClass, classname, ...rest }, ref) => {
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
